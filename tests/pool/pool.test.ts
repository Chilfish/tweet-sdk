import type { FetcherService } from '../../src/lib/services/public/FetcherService'
import { describe, expect, it, vi } from 'vitest'
import { AuthError, NotSupportedError, PoolExhaustedError, RateLimitError, TwitterApiError } from '../../src/lib/errors'
import { RettiwtPool } from '../../src/lib/pool'

function fakeFetcher() {
  return {} as FetcherService
}

function makePool(
  keys: string[],
  failures: Array<unknown | Error>,
  options: Partial<ConstructorParameters<typeof RettiwtPool>[1]> = {},
) {
  let call = 0
  const createFetcher = vi.fn((_key?: string) => fakeFetcher())

  const pool = new RettiwtPool(keys, {
    backoffMs: 0,
    cooldownMs: 0,
    createFetcher,
    ...options,
  })

  const run = () => pool.run(async () => {
    const failure = failures[call++] ?? failures.at(-1)
    if (failure)
      throw failure
    return 'ok'
  })

  return { pool, run, createFetcher }
}

describe('rettiwtPool', () => {
  it('uses a single key when no API keys are configured', async () => {
    const { run, createFetcher } = makePool([], [])
    await expect(run()).resolves.toBe('ok')
    expect(createFetcher).toHaveBeenCalledWith(undefined)
  })

  it('returns the result without rotating on success', async () => {
    const { run, createFetcher } = makePool(['a', 'b'], [])
    await expect(run()).resolves.toBe('ok')
    expect(createFetcher).toHaveBeenCalledTimes(1)
  })

  it('rotates on a rate-limited key and succeeds with the next one', async () => {
    const { run } = makePool(['a', 'b'], [
      new RateLimitError('429'),
      null,
    ])
    await expect(run()).resolves.toBe('ok')
  })

  it('classifies auth errors as key-level failures', async () => {
    const { run } = makePool(['a', 'b'], [
      new AuthError('401'),
      null,
    ])
    await expect(run()).resolves.toBe('ok')
  })

  it('does not retry non key-level 4xx errors', async () => {
    const { run, createFetcher } = makePool(['a', 'b'], [
      new TwitterApiError('400', { status: 400 }),
    ])
    await expect(run()).rejects.toThrow('400')
    expect(createFetcher).toHaveBeenCalledTimes(1)
  })

  it('does not retry or reclassify NotSupportedError', async () => {
    const { run, createFetcher } = makePool(['a'], [
      new NotSupportedError('missing credential'),
    ])

    const error = await run().catch((err: unknown) => err)
    expect(error).toBeInstanceOf(NotSupportedError)
    expect((error as NotSupportedError).status).toBe(403)
    expect(createFetcher).toHaveBeenCalledTimes(1)
  })

  it('retries transient 408 / 425 / 5xx without cooling the key', async () => {
    for (const status of [408, 425, 500, 503]) {
      const logger = {
        warn: vi.fn(),
      }
      const { run, createFetcher } = makePool(['a'], [
        new TwitterApiError(`status ${status}`, { status }),
        null,
      ], {
        backoffMs: 1_000,
        cooldownMs: 10_000,
        logger,
      })

      await expect(run()).resolves.toBe('ok')
      expect(createFetcher).toHaveBeenCalledTimes(1)
      expect(logger.warn).toHaveBeenCalledWith('pool.rotate', expect.objectContaining({
        cooldownMs: 0,
      }))
    }
  })

  it('throws RateLimitError when every key is rate limited', async () => {
    const error = await makePool(['a'], [
      new RateLimitError('429'),
    ], { maxAttempts: 2 }).run().catch((err: unknown) => err)

    expect(error).toBeInstanceOf(RateLimitError)
    expect((error as RateLimitError).status).toBe(429)
    expect((error as Error).message).toContain('All keys exhausted')
  })

  it('throws AuthError when every key is rejected', async () => {
    const error = await makePool(['a'], [
      new AuthError('403', { status: 403 }),
    ], { maxAttempts: 2 }).run().catch((err: unknown) => err)

    expect(error).toBeInstanceOf(AuthError)
    expect((error as AuthError).status).toBe(403)
  })

  it('does not classify a network failure as 401', async () => {
    const error = await makePool(['a'], [
      new Error('fetch failed'),
    ], {
      maxAttempts: 2,
      shouldRetry: () => true,
    }).run().catch((err: unknown) => err)

    expect(error).toBeInstanceOf(PoolExhaustedError)
    expect(error).toBeInstanceOf(TwitterApiError)
    expect((error as PoolExhaustedError).status).toBeUndefined()
    expect((error as Error).message).toContain('All keys exhausted')
  })

  it('accepts a custom classifier', async () => {
    const shouldRetry = vi.fn(() => true)
    const { run } = makePool(['a', 'b'], [
      new Error('boom'),
      null,
    ], { shouldRetry })
    await expect(run()).resolves.toBe('ok')
    expect(shouldRetry).toHaveBeenCalled()
  })

  it('reports rotation through the injected logger', async () => {
    const logger = {
      warn: vi.fn(),
    }
    const { run } = makePool(['a', 'b'], [
      new RateLimitError('429'),
      null,
    ], { logger })
    await run()
    expect(logger.warn).toHaveBeenCalledWith('pool.rotate', expect.objectContaining({
      keySuffix: expect.stringMatching(/^\.\.\./),
      reason: '429',
    }))
    expect(logger.warn).toHaveBeenCalledWith('pool.rotate', expect.not.objectContaining({
      key: expect.anything(),
    }))
  })

  it('exposes per-key status after rotation', async () => {
    const { pool, run } = makePool(['a', 'b'], [
      new RateLimitError('429'),
      null,
    ], {
      backoffMs: 1_000,
      cooldownMs: 10_000,
    })

    await run()

    const status = pool.status()
    expect(status).toHaveLength(2)
    expect(status.every(entry => entry.inFlight === 0)).toBe(true)

    const failed = status.find(entry => entry.failStreak === 1)!
    expect(failed).toBeDefined()
    expect(failed.cooldownLeftMs).toBeGreaterThan(0)
  })

  it('reports NO_KEY for guest sessions', () => {
    expect(new RettiwtPool([]).status()).toEqual([
      {
        keySuffix: 'NO_KEY',
        cooldownLeftMs: 0,
        failStreak: 0,
        inFlight: 0,
      },
    ])
  })
})
