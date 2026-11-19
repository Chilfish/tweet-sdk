import type { EnrichedTweet } from '../../lib/types/enriched'
import { defineCommand } from 'citty'
import { TweetRepliesSortType } from '../../lib/enums/Tweet'
import { createPrinter, outputFormatArg } from '../output'
import { parsePositiveInt } from '../parseArgs'
import { renderTweetMarkdown, renderTweetsMarkdown } from '../render'
import { clientArg, createClient, enrich } from '../shared'

const sortAliases: Record<string, TweetRepliesSortType> = {
  likes: TweetRepliesSortType.LIKES,
  latest: TweetRepliesSortType.LATEST,
  relevance: TweetRepliesSortType.RELEVANCE,
}

export const tweetGet = defineCommand({
  meta: {
    name: 'get',
    description: 'Fetch a single tweet and enrich it (quoted tweet, card, poll, article, media)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Tweet ID',
      required: true,
    },
    raw: {
      type: 'boolean',
      description: 'Output the raw upstream response (no enrichment; markdown falls back to JSON)',
    },
    ...outputFormatArg,
    ...clientArg,
  },
  async run({ args }) {
    const print = createPrinter(args)
    const client = createClient(args)
    const raw = await client.getTweet(args.id)

    if (args.raw) {
      print(raw, {
        markdown: value => JSON.stringify(value, null, 2),
      })
      return
    }

    const tweet = enrich(raw)
    if (!tweet) {
      print(raw, {
        markdown: () => `Tweet ${args.id} is unavailable (tombstone or schema change)`,
      })
      return
    }

    print(tweet, { markdown: renderTweetMarkdown })
  },
})

export const tweetReplies = defineCommand({
  meta: {
    name: 'replies',
    description: 'Fetch tweet replies (includes the root tweet and the next-page cursor)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Tweet ID',
      required: true,
    },
    cursor: {
      type: 'string',
      description: 'Pagination cursor (the nextCursor returned by the previous page)',
    },
    count: {
      type: 'string',
      description: 'Items per page (X caps it at about 20)',
    },
    sort: {
      type: 'string',
      description: 'Sort order: likes (default) / latest / relevance',
    },
    ...outputFormatArg,
    ...clientArg,
  },
  async run({ args }) {
    const print = createPrinter(args)
    const client = createClient(args)
    const sort = sortAliases[String(args.sort ?? 'likes').toLowerCase()]

    const result = await client.getReplies(args.id, {
      cursor: args.cursor,
      sortBy: sort,
      count: parsePositiveInt(args.count),
    })

    const tweets = result.tweets
      .map(tweet => enrich(tweet))
      .filter((tweet): tweet is EnrichedTweet => tweet !== null)

    print({ tweets, nextCursor: result.nextCursor }, {
      markdown: value => renderTweetsMarkdown(value.tweets, `Replies to ${args.id}`),
    })
  },
})

export const tweetSearch = defineCommand({
  meta: {
    name: 'search',
    description: 'Search tweets (supports X advanced operators such as from: / since: / min_faves:)',
  },
  args: {
    query: {
      type: 'positional',
      description: 'Search keyword or query expression',
      required: true,
    },
    type: {
      type: 'string',
      description: 'Result type: top / latest (default latest)',
    },
    count: {
      type: 'string',
      description: 'Items per page (SearchTimeline caps it at about 20)',
    },
    cursor: {
      type: 'string',
      description: 'Pagination cursor (the nextCursor returned by the previous page)',
    },
    ...outputFormatArg,
    ...clientArg,
  },
  async run({ args }) {
    const print = createPrinter(args)
    const client = createClient(args)
    const type = args.type === 'top'
      ? 'top'
      : 'latest'

    const result = await client.searchTweets(args.query, {
      type,
      count: parsePositiveInt(args.count),
      cursor: args.cursor,
    })

    const tweets = result.tweets
      .map(tweet => enrich(tweet))
      .filter((tweet): tweet is EnrichedTweet => tweet !== null)

    print({ tweets, nextCursor: result.nextCursor }, {
      markdown: value => renderTweetsMarkdown(value.tweets, `Search: ${args.query}`),
    })
  },
})
