import type { EnrichedTweet } from '../../lib/types/enriched'
import { defineCommand } from 'citty'
import { createPrinter, outputFormatArg } from '../output'
import { parsePositiveInt } from '../parseArgs'
import { renderTweetsMarkdown, renderUserMarkdown } from '../render'
import { clientArg, createClient, enrich } from '../shared'

export const userGet = defineCommand({
  meta: {
    name: 'get',
    description: '获取用户资料（用户名或数字 ID）',
  },
  args: {
    id: {
      type: 'positional',
      description: '用户名（@ 可省略）或数字 ID',
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
        markdown: () => `未找到用户 ${args.id}`,
      })
      return
    }

    print(user, { markdown: renderUserMarkdown })
  },
})

export const userTimeline = defineCommand({
  meta: {
    name: 'timeline',
    description: '获取用户时间线（帖子 + 回复，按 bottom cursor 翻页）',
  },
  args: {
    id: {
      type: 'positional',
      description: '用户数字 ID',
      required: true,
    },
    cursor: {
      type: 'string',
      description: '翻页 cursor（上一页返回的 nextCursor）',
    },
    limit: {
      type: 'string',
      description: '本页最多输出条数（客户端截断）',
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
