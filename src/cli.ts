/**
 * CLI command tree.
 *
 * This module is what the `./cli` subpath export resolves to; `src/cli-bin.ts` is the actual bin entry
 * (it handles the Node version check, unknown flag validation, and the error envelope).
 */
import { defineCommand } from 'citty'
import pkg from '../package.json' with { type: 'json' }
import { listTweets } from './cli/commands/list'
import { mediaDownload } from './cli/commands/media'
import { spaceGet } from './cli/commands/space'
import { tweetGet, tweetReplies, tweetSearch } from './cli/commands/tweet'
import { userGet, userTimeline } from './cli/commands/user'

export const main = defineCommand({
  meta: {
    name: 'tweet-cli',
    version: pkg.version,
    description:
      'Fetch and enrich X (Twitter) data from the command line\n\n'
      + 'Auth: --keys <base64 cookie list> / --cookie <raw Cookie> / TWEET_KEYS from .env\n'
      + 'Output: JSON by default; add --format markdown (-f md) for human-readable output; errors go to a JSON envelope on stderr',
  },
  subCommands: {
    tweet: defineCommand({
      meta: { name: 'tweet', description: 'Tweets: get / replies / search' },
      subCommands: {
        get: tweetGet,
        replies: tweetReplies,
        search: tweetSearch,
      },
    }),
    user: defineCommand({
      meta: { name: 'user', description: 'Users: profile / timeline' },
      subCommands: {
        get: userGet,
        timeline: userTimeline,
      },
    }),
    space: defineCommand({
      meta: { name: 'space', description: 'Space metadata' },
      subCommands: { get: spaceGet },
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'Lists' },
      subCommands: { tweets: listTweets },
    }),
    media: defineCommand({
      meta: { name: 'media', description: 'Media downloads' },
      subCommands: { download: mediaDownload },
    }),
  },
})

/** Recursively wrap every command's `run`: uncaught errors are emitted as a JSON error envelope. */
export function withErrorEnvelope<
  T extends {
    run?: (...args: any[]) => any
    subCommands?: Record<string, any>
  },
>(command: T): T {
  if (command.run) {
    const run = command.run
    command.run = async (...args: any[]) => {
      try {
        return await run(...args)
      }
      catch (error) {
        const { formatCliError } = await import('./cli/shared')
        console.error(JSON.stringify(formatCliError(error)))
        process.exit(1)
      }
    }
  }
  for (const sub of Object.values(command.subCommands ?? {}))
    withErrorEnvelope(sub)
  return command
}

export { formatCliError } from './cli/shared'
export { showCliUsage } from './cli/usage'
export { assertKnownFlags } from './cli/validateArgs'
