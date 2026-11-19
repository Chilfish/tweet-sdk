/**
 * CLI 命令树。
 *
 * `./cli` 子路径导出的就是这个模块；`src/cli-bin.ts` 是实际的 bin 入口
 * （负责 Node 版本检查、未知参数校验与错误信封）。
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
      'X（Twitter）取数与推文富化命令行\n\n'
      + '认证：--keys <base64 cookie 列表> / --cookie <原始 Cookie> / .env 的 TWEET_KEYS\n'
      + '输出：默认 JSON，加 --format markdown（-f md）给人读；错误走 stderr 的 JSON 信封',
  },
  subCommands: {
    tweet: defineCommand({
      meta: { name: 'tweet', description: '推文：获取 / 回复 / 搜索' },
      subCommands: {
        get: tweetGet,
        replies: tweetReplies,
        search: tweetSearch,
      },
    }),
    user: defineCommand({
      meta: { name: 'user', description: '用户：资料 / 时间线' },
      subCommands: {
        get: userGet,
        timeline: userTimeline,
      },
    }),
    space: defineCommand({
      meta: { name: 'space', description: 'Space 元数据' },
      subCommands: { get: spaceGet },
    }),
    list: defineCommand({
      meta: { name: 'list', description: '列表' },
      subCommands: { tweets: listTweets },
    }),
    media: defineCommand({
      meta: { name: 'media', description: '媒体下载' },
      subCommands: { download: mediaDownload },
    }),
  },
})

/** 递归包装所有命令的 run：未捕获错误统一输出 JSON 错误信封。 */
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
