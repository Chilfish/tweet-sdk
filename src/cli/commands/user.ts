import type { EnrichedTweet } from '../../lib/types/enriched'
import { defineCommand } from 'citty'
import { createPrinter, outputFormatArg } from '../output'
import { parsePositiveInt } from '../parseArgs'
import { renderTweetsMarkdown, renderUserMarkdown } from '../render'
import { clientArg, createClient, enrich } from '../shared'

export const userGet = defineCommand({
  meta: {
    name: 'get',
    description: 'Fetch a user profile (username or numeric ID)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Username (the @ is optional) or numeric ID',
      required: true,
    },
    ...outputFormatArg,
    ...clientArg,
  },
  async run({ args }) {
    const print = createPrinter(args)
    const client = createClient(args)
    const user = await client.getUser(args.id)

    if (!user) {
      print(null, {
        markdown: () => `User ${args.id} not found`,
      })
      return
    }

    print(user, { markdown: renderUserMarkdown })
  },
})

export const userTimeline = defineCommand({
  meta: {
    name: 'timeline',
    description: 'Fetch a user timeline (posts + replies, paged by bottom cursor)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Numeric user ID',
      required: true,
    },
    cursor: {
      type: 'string',
      description: 'Pagination cursor (the nextCursor returned by the previous page)',
    },
    limit: {
      type: 'string',
      description: 'Maximum items emitted for this page (truncated client-side)',
    },
    ...outputFormatArg,
    ...clientArg,
  },
  async run({ args }) {
    const print = createPrinter(args)
    const client = createClient(args)
    const result = await client.getUserTimeline(args.id, args.cursor)
    const limit = parsePositiveInt(args.limit)

    const tweets = result.tweets
      .slice(0, limit ?? result.tweets.length)
      .map(tweet => enrich(tweet))
      .filter((tweet): tweet is EnrichedTweet => tweet !== null)

    print({ tweets, nextCursor: result.nextCursor }, {
      markdown: value => renderTweetsMarkdown(value.tweets, `Timeline of ${args.id}`),
    })
  },
})
