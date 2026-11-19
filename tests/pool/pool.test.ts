import type { FetcherService } from '../../src/lib/services/public/FetcherService'
import { describe, expect, it, vi } from 'vitest'
import { AuthError, RateLimitError, TwitterApiError } from '../../src/lib/errors'
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

  it('does not retry non key-level errors', async () => {
    const { run, createFetcher } = makePool(['a', 'b'], [
      new TwitterApiError('500', { status: 500 }),
    ])
    await expect(run()).rejects.toThrow('500')
    expect(createFetcher).toHaveBeenCalledTimes(1)
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
      reason: '429',
    }))
  })
})
