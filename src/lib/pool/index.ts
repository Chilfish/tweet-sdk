import type { TwitterApiError, TwitterApiErrorOptions } from '../errors'
import type { HttpClient } from '../http/types'
import type { Logger } from '../types/Logger'
import type { TidProvider } from '../types/TidProvider'

import { AuthError, NotSupportedError, PoolExhaustedError, RateLimitError } from '../errors'
import { createProxyHttpClient } from '../http/proxy'
import { RettiwtConfig } from '../models/RettiwtConfig'
import { FetcherService } from '../services/public/FetcherService'

type Task<T> = (fetcher: FetcherService) => Promise<T>

export interface RetryDecision {
  /** Whether the request is worth retrying (rotate key / back off). */
  retryable: boolean
  /** Whether the key should cool down. 429/401/403 all do. */
  cooldown: boolean
}

export type RetryClassifier = (error: unknown) => RetryDecision | boolean

/** Minimal logger facade; keeps the pool free of `console` and app-specific logging. */
export type RettiwtPoolLogger = Logger

export interface RettiwtPoolOptions {
  /** Cooldown per key in ms (default 30s — the typical 429 window). */
  cooldownMs?: number
  /** Exponential backoff base in ms (default 1000). */
  backoffMs?: number
  /** Max attempts (default `max(3, keys.length * 2)`). */
  maxAttempts?: number
  /** Injectable retry classifier (defaults to status 429/401/403). */
  shouldRetry?: RetryClassifier
  /** Injectable fetcher factory (tests, custom transports). */
  createFetcher?: (key?: string) => FetcherService
  /** Logger for rotation / exhaustion events. */
  logger?: Logger
  /** Transport passed to the default fetcher factory. */
  httpClient?: HttpClient
  /** HTTP(S) proxy; uses Bun's native fetch option when `httpClient` is absent (Node: use `createProxyFetch`). */
  proxy?: string
  /** Transaction-id provider passed to the default fetcher factory. */
  tidProvider?: TidProvider
  /** Extra headers passed to the default fetcher factory. */
  headers?: Record<string, string>
  /** Request timeout passed to the default fetcher factory. */
  timeout?: number
  /** Per-request retries passed to the default fetcher factory. */
  maxRetries?: number
}

interface KeyState {
  cooldownUntil: number
  failStreak: number
  inFlight: number
}

/** Per-key state exposed by {@link RettiwtPool.status}. */
export interface PoolKeyStatus {
  /** `...<last 6>` of the key, or `NO_KEY` for guest sessions. */
  keySuffix: string
  cooldownLeftMs: number
  failStreak: number
  inFlight: number
}

const NO_KEY = '__NO_API_KEY__'

function errorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null)
    return undefined

  const candidate = error as Record<string, unknown>
  for (const value of [candidate.status, candidate.statusCode]) {
    if (typeof value === 'number')
      return value
  }
  return undefined
}

/**
 * Default classifier:
 * - 429 / 401 / 403: key-level failure; rotate and cool the key down
 * - 408 / 425 / 5xx: transient upstream failure; retry without cooling the key
 */
const defaultClassifier: RetryClassifier = (error) => {
  // A missing user credential is a configuration error, not a key-level failure:
  // keep the original NotSupportedError instead of exhausting into AuthError.
  if (error instanceof NotSupportedError)
    return false

  const status = errorStatus(error)
  if (status === undefined)
    return false
  if (status === 429 || status === 401 || status === 403)
    return { retryable: true, cooldown: true }
  if (status === 408 || status === 425 || (status >= 500 && status <= 599))
    return { retryable: true, cooldown: false }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)))
}

/**
 * Multi-key rotating pool.
 *
 * - **per-key cooldown**: a key rejected with 429/401/403 sits out until
 *   `cooldownUntil`; requests prefer idle keys.
 * - **exponential backoff**: a single key backs off by `min(cooldownMs, backoffMs * 2^n)`
 *   instead of failing immediately.
 * - **failure isolation**: `failStreak` / `inFlight` are tracked per key and
 *   aggregated into the exhaustion error.
 * - **testability**: `shouldRetry` and `createFetcher` are injectable.
 */
export class RettiwtPool {
  private readonly keys: Array<string | undefined>
  private readonly hasApiKeys: boolean
  private readonly options: Pick<RettiwtPoolOptions, 'createFetcher'> & Required<Pick<RettiwtPoolOptions, 'cooldownMs' | 'backoffMs' | 'maxAttempts' | 'shouldRetry'>>
  private readonly keyStates = new Map<string, KeyState>()
  private readonly instanceCache = new Map<string, FetcherService>()
  private currentIndex = 0

  public constructor(keys: string[], options: RettiwtPoolOptions = {}) {
    const sanitized = keys.map(key => key.trim()).filter(Boolean)
    this.hasApiKeys = sanitized.length > 0
    this.keys = this.hasApiKeys
      ? sanitized
      : [undefined]
    this.options = {
      cooldownMs: options.cooldownMs ?? 30_000,
      backoffMs: options.backoffMs ?? 1_000,
      maxAttempts: Math.max(3, options.maxAttempts ?? this.keys.length * 2),
      shouldRetry: options.shouldRetry ?? defaultClassifier,
      createFetcher: options.createFetcher,
    }

    for (const key of this.keys)
      this.keyStates.set(key ?? NO_KEY, { cooldownUntil: 0, failStreak: 0, inFlight: 0 })

    this.logger = options.logger
    this.factoryOptions = options
    this.defaultHttpClient = options.httpClient
      ?? (options.proxy
        ? createProxyHttpClient(options.proxy)
        : undefined)
  }

  private readonly logger?: RettiwtPoolLogger
  private readonly factoryOptions: RettiwtPoolOptions
  private readonly defaultHttpClient?: HttpClient

  /**
   * Reserves a key, runs the task, and on key-level failures cools the key
   * down, rotates and retries with backoff.
   */
  public async run<T>(task: Task<T>, attempt = 0): Promise<T> {
    const { key, fetcher } = this.reserveKey()
    const state = this.getState(key)
    state.inFlight += 1

    try {
      const result = await task(fetcher)
      state.failStreak = 0
      state.inFlight -= 1
      return result
    }
    catch (error) {
      state.inFlight -= 1
      return this.onFailure(task, error, attempt, key)
    }
  }

  private async onFailure<T>(
    task: Task<T>,
    error: unknown,
    attempt: number,
    key: string | undefined,
  ): Promise<T> {
    const state = this.getState(key)
    const decision = this.toDecision(this.options.shouldRetry(error))

    if (!decision.retryable)
      throw error

    if (attempt + 1 >= this.options.maxAttempts)
      throw this.buildExhaustedError(attempt, error)

    state.failStreak += 1
    if (decision.cooldown) {
      state.cooldownUntil = Date.now()
        + Math.min(this.options.cooldownMs, this.options.backoffMs * 2 ** Math.min(state.failStreak - 1, 6))
    }

    this.logger?.warn?.('pool.rotate', {
      keySuffix: key
        ? `...${key.slice(-6)}`
        : 'NO_KEY',
      failStreak: state.failStreak,
      cooldownMs: Math.max(0, state.cooldownUntil - Date.now()),
      reason: error instanceof Error
        ? error.message.slice(0, 160)
        : String(error).slice(0, 160),
    })

    await sleep(this.delayUntilAvailable())
    return this.run(task, attempt + 1)
  }

  /** Picks an idle, non-cooling key; falls back to the earliest cooling key. */
  private reserveKey(): { key: string | undefined, fetcher: FetcherService } {
    const now = Date.now()
    const candidates: Array<{ key: string | undefined, state: KeyState }> = []

    for (let i = 0; i < this.keys.length; i++) {
      const index = (this.currentIndex + i) % this.keys.length
      const key = this.keys[index]!
      if (this.getState(key).cooldownUntil <= now) {
        candidates.push({
          key,
          state: this.getState(key),
        })
      }
    }

    let chosen: { key: string | undefined, state: KeyState }
    if (candidates.length > 0) {
      chosen = candidates.find(candidate => candidate.state.inFlight === 0) ?? candidates[0]!
    }
    else {
      chosen = this.keys
        .map(key => ({
          key,
          state: this.getState(key),
        }))
        .sort((a, b) => a.state.cooldownUntil - b.state.cooldownUntil)[0]!
    }

    this.currentIndex = (this.keys.indexOf(chosen.key) + 1) % this.keys.length
    return {
      key: chosen.key,
      fetcher: this.getOrCreateFetcher(chosen.key),
    }
  }

  /** Zero when any key is available, otherwise the wait until the earliest cooldown ends. */
  private delayUntilAvailable(): number {
    const now = Date.now()
    if (this.keys.some(key => this.getState(key).cooldownUntil <= now))
      return 0

    const earliest = this.keys.reduce(
      (min, key) => Math.min(min, this.getState(key).cooldownUntil),
      Number.POSITIVE_INFINITY,
    )
    return earliest === Number.POSITIVE_INFINITY
      ? 0
      : earliest - now
  }

  private getState(key: string | undefined): KeyState {
    return this.keyStates.get(key ?? NO_KEY)!
  }

  private getOrCreateFetcher(key: string | undefined): FetcherService {
    const cacheKey = key ?? NO_KEY
    let fetcher = this.instanceCache.get(cacheKey)

    if (!fetcher) {
      fetcher = this.options.createFetcher
        ? this.options.createFetcher(key)
        : new FetcherService(new RettiwtConfig({
            apiKey: this.hasApiKeys ? key : undefined,
            httpClient: this.defaultHttpClient,
            tidProvider: this.factoryOptions.tidProvider,
            headers: this.factoryOptions.headers,
            timeout: this.factoryOptions.timeout,
            maxRetries: this.factoryOptions.maxRetries,
          }))
      this.instanceCache.set(cacheKey, fetcher)
    }

    return fetcher
  }

  private toDecision(decision: RetryDecision | boolean): RetryDecision {
    return typeof decision === 'boolean'
      ? { retryable: decision, cooldown: decision }
      : decision
  }

  /** Snapshot of every key's cooldown / failure / in-flight state. */
  public status(): PoolKeyStatus[] {
    const now = Date.now()
    return this.keys.map((key) => {
      const state = this.getState(key)
      return {
        keySuffix: key
          ? `...${key.slice(-6)}`
          : 'NO_KEY',
        cooldownLeftMs: Math.max(0, state.cooldownUntil - now),
        failStreak: state.failStreak,
        inFlight: state.inFlight,
      }
    })
  }

  private buildExhaustedError(attempt: number, lastError: unknown): TwitterApiError {
    const summary = this.keys.map((key) => {
      const state = this.getState(key)
      const label = key
        ? `...${key.slice(-6)}`
        : 'NO_KEY'
      return `${label}: streak=${state.failStreak}, cooldownLeft=${Math.max(0, state.cooldownUntil - Date.now())}ms`
    }).join('; ')

    this.logger?.warn?.('pool.exhaust', { attempts: attempt + 1, states: summary })

    const message = lastError instanceof Error
      ? lastError.message
      : String(lastError)
    const text = `[RettiwtPool] All keys exhausted after ${attempt + 1} attempts. Last error: ${message}. States: ${summary}`
    const options: TwitterApiErrorOptions = {
      status: errorStatus(lastError),
      cause: lastError,
    }

    return options.status === 429
      ? new RateLimitError(text, options)
      : options.status === 401 || options.status === 403
        ? new AuthError(text, options)
        : new PoolExhaustedError(text, options)
  }
}
