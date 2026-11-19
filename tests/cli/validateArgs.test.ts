import { describe, expect, it } from 'vitest'
import { main } from '../../src/cli'
import { assertKnownFlags } from '../../src/cli/validateArgs'

describe('assertKnownFlags', () => {
  it('accepts declared flags and positionals', async () => {
    await expect(assertKnownFlags(main, [
      'tweet',
      'get',
      '123',
      '--raw',
      '--format',
      'json',
    ])).resolves.toBeUndefined()
  })

  it('accepts builtin flags', async () => {
    await expect(assertKnownFlags(main, ['--help'])).resolves.toBeUndefined()
    await expect(assertKnownFlags(main, ['--version'])).resolves.toBeUndefined()
  })

  it('rejects unknown flags with a suggestion', async () => {
    const error = await assertKnownFlags(main, ['tweet', 'get', '123', '--raww']).catch((err: unknown) => err)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('Unknown option --raww')
    expect((error as Error).message).toContain('--raw')
  })

  it('rejects options that belong to a subcommand', async () => {
    const error = await assertKnownFlags(main, ['--raw', 'tweet', 'get', '123']).catch((err: unknown) => err)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('Unknown option --raw for tweet-cli')
    // The parameter is declared by the subcommand: the context carries the fix
    // "write it after the subcommand"
    expect((error as { context?: Record<string, unknown> }).context?.next).toContain('put --raw after the subcommand')
  })

  it('stops parsing at --', async () => {
    await expect(assertKnownFlags(main, ['tweet', 'search', '--', '--raw'])).resolves.toBeUndefined()
  })

  it('does not treat a value as a flag', async () => {
    await expect(assertKnownFlags(main, [
      'tweet',
      'search',
      '--format',
      '--not-a-flag',
    ])).resolves.toBeUndefined()
  })
})
