import type { HttpClient } from '../lib/http/types'
import type { RettiwtPoolLogger } from '../lib/pool'

import { readFile } from 'node:fs/promises'
import { TwitterClient } from '../lib/client'
import { encodeBase64 } from '../lib/http/base64'
import { createFetchHttpClient } from '../lib/http/fetch'

/**
 * Node adapters.
 *
 * Everything transport- or filesystem-specific lives here so the core entry
 * stays platform-neutral.
 */

/** Reads a media file into a `Blob` for `tweet.upload()`. */
export async function readMediaFile(path: string): Promise<Blob> {
  const buffer = await readFile(path)
  return new Blob([
    new Uint8Array(buffer),
  ])
}

/**
 * Creates a fetch client that routes through an HTTP(S) proxy.
 *
 * Uses undici's `ProxyAgent` as the fetch dispatcher. SOCKS proxies are not
 * supported by the fetch transport; use an HTTP(S) proxy instead.
 */
export function createProxyFetch(proxy: string): HttpClient {
  let dispatcherPromise: Promise<unknown> | undefined

  const getDispatcher = async (): Promise<unknown> => {
    if (!proxy.startsWith('http://') && !proxy.startsWith('https://'))
      throw new Error(`Unsupported proxy scheme for the fetch transport: ${proxy}. Use http:// or https://`)

    dispatcherPromise ??= import('undici')
      .then(({ ProxyAgent }) => new ProxyAgent(proxy))
      .catch(() => {
        throw new Error(
          'Proxy support requires the optional peer dependency "undici". '
          + 'Install it with `bun add undici` (or `npm i undici`).',
        )
      })
    return dispatcherPromise
  }

  return createFetchHttpClient({
    async init() {
      return { dispatcher: await getDispatcher() } as RequestInit
    },
  })
}

export interface CreateNodeClientOptions {
  /** Ready-to-use API keys (base64-encoded cookies). */
  keys?: string[]
  /** Raw `k=v; k=v` cookie, encoded to an API key for you. */
  cookie?: string
  /** HTTP(S) proxy URL. */
  proxy?: string | null
  timeout?: number
  maxRetries?: number
  headers?: Record<string, string>
  logger?: RettiwtPoolLogger
}

function readEnvKeys(): string[] {
  const raw = typeof process === 'undefined'
    ? ''
    : process.env.TWEET_KEYS || ''
  return raw.split(',').map(key => key.trim()).filter(Boolean)
}

function readEnvProxy(): string | undefined {
  if (typeof process === 'undefined')
    return undefined
  return process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy || undefined
}

/**
 * Convenience factory for Node scripts.
 *
 * Resolution order:
 * - keys: `options.keys` → `options.cookie` (encoded) → `TWEET_KEYS`
 * - proxy: `options.proxy` → `http_proxy` / `HTTPS_PROXY`
 */
export function createNodeClient(options: CreateNodeClientOptions = {}): TwitterClient {
  const rawKeys = options.keys?.length
    ? options.keys
    : options.cookie
      ? [
          encodeBase64(options.cookie),
        ]
      : readEnvKeys()

  const proxy = options.proxy === null
    ? undefined
    : options.proxy ?? readEnvProxy()

  return new TwitterClient(rawKeys, {
    httpClient: proxy
      ? createProxyFetch(proxy)
      : undefined,
    timeout: options.timeout,
    maxRetries: options.maxRetries,
    headers: options.headers,
    logger: options.logger,
  })
}
