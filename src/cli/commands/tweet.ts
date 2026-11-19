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
    description: '获取单条推文并富化（引用推文、卡片、投票、文章、媒体）',
  },
  args: {
    id: {
      type: 'positional',
      description: '推文 ID',
      required: true,
    },
    raw: {
      type: 'boolean',
      description: '输出上游原始响应（不富化；markdown 回退为 JSON）',
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
        markdown: () => `Tweet ${args.id} 不可用（tombstone 或结构变更）`,
      })
      return
    }

    print(tweet, { markdown: renderTweetMarkdown })
  },
})

export const tweetReplies = defineCommand({
  meta: {
    name: 'replies',
    description: '获取推文回复（含主推文与下一页 cursor）',
  },
  args: {
    id: {
      type: 'positional',
      description: '推文 ID',
      required: true,
    },
    cursor: {
      type: 'string',
      description: '翻页 cursor（上一页返回的 nextCursor）',
    },
    count: {
      type: 'string',
      description: '每页数量（X 上限约 20）',
    },
    sort: {
      type: 'string',
      description: '排序：likes（默认）/ latest / relevance',
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
    description: '搜索推文（支持 from: / since: / min_faves: 等 X 高级语法）',
  },
  args: {
    query: {
      type: 'positional',
      description: '搜索关键词或查询表达式',
      required: true,
    },
    type: {
      type: 'string',
      description: '结果类型：top / latest（默认 latest）',
    },
    count: {
      type: 'string',
      description: '每页数量（SearchTimeline 上限约 20）',
    },
    cursor: {
      type: 'string',
      description: '翻页 cursor（上一页返回的 nextCursor）',
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
