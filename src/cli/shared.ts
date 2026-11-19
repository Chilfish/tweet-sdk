import type { TwitterClient } from '../lib/client'
import type { RettiwtPoolLogger } from '../lib/pool'
import type { EnrichedTweet, RawTweet } from '../lib/types/enriched'
import { TwitterApiError } from '../lib/errors'
import { enrichTweet } from '../lib/parse/tweet'
import { createNodeClient } from '../node'
import { getEnvFilePath, readEnvFile } from './env'
import { CliError } from './error'
import { parsePositiveInt } from './parseArgs'

/** 所有查询命令共用的连接参数。 */
export const clientArg = {
  'keys': {
    type: 'string',
    description: 'API key 列表（逗号分隔，base64 cookie；默认读 --env-file 的 TWEET_KEYS）',
    alias: 'k',
  },
  'cookie': {
    type: 'string',
    description: '原始 Cookie 串（k=v; k=v；显式覆盖 keys，自动 base64 编码）',
  },
  'env-file': {
    type: 'string',
    description: '环境文件路径（默认 <pwd>/.env，读取 TWEET_KEYS / http_proxy）',
  },
  'proxy': {
    type: 'string',
    description: 'HTTP(S) 代理地址（默认读 --env-file 的 http_proxy / HTTPS_PROXY）',
    alias: 'p',
  },
  'timeout': {
    type: 'string',
    description: '单次请求超时 ms（默认交给运行时 / 上游）',
  },
  'verbose': {
    type: 'boolean',
    description: '把 pool 轮换 / 解析回退事件以 JSON 行输出到 stderr',
    alias: 'v',
  },
} as const

/** `--keys`、`TWEET_KEYS` 都是逗号分隔；空白项丢弃。 */
function splitKeys(value: string | undefined): string[] {
  if (!value)
    return []
  return value.split(',').map(key => key.trim()).filter(Boolean)
}

/** `--verbose` 时使用的 pool logger：单行 JSON，便于采集。 */
function verboseLogger(args: Record<string, unknown>): RettiwtPoolLogger | undefined {
  if (args.verbose !== true)
    return undefined
  return {
    warn: (event, fields) => {
      console.error(JSON.stringify({ event, level: 'warn', ...fields }))
    },
  }
}

/**
 * 按 CLI 参数构造客户端。
 *
 * 优先级：
 * - keys：`--keys` → `--cookie`（原始 Cookie 编码）→ `--env-file` 的 `TWEET_KEYS`
 * - proxy：`--proxy` → `--env-file` 的 `http_proxy` / `HTTPS_PROXY`
 */
export function createClient(args: Record<string, unknown>): TwitterClient {
  const env = readEnvFile(getEnvFilePath(args['env-file']))
  const explicitKeys = splitKeys(typeof args.keys === 'string'
    ? args.keys
    : undefined)
  const envKeys = splitKeys(env.TWEET_KEYS)
  const cookie = typeof args.cookie === 'string' && args.cookie.trim() !== ''
    ? args.cookie.trim()
    : undefined

  const proxy = typeof args.proxy === 'string' && args.proxy.trim() !== ''
    ? args.proxy.trim()
    : env.http_proxy || env.HTTPS_PROXY || env.https_proxy || undefined

  const timeout = parsePositiveInt(args.timeout)

  return createNodeClient({
    keys: explicitKeys.length
      ? explicitKeys
      : cookie
        ? undefined
        : envKeys,
    cookie,
    proxy,
    timeout,
    logger: verboseLogger(args),
  })
}

/**
 * 把任意错误转换成 CLI 的 JSON 错误信封（stderr）。
 *
 * 核心错误额外携带 `status` / `code`，便于脚本在不解自然语言的情况下决定重试。
 */
export function formatCliError(error: unknown): Record<string, unknown> {
  if (error instanceof CliError) {
    return {
      event: 'error',
      code: error.code,
      message: error.message,
      ...(Object.keys(error.context).length
        ? { context: error.context }
        : {}),
    }
  }

  if (error instanceof TwitterApiError) {
    return {
      event: 'error',
      code: 'REQUEST_FAILED',
      ...(error.status === undefined
        ? {}
        : { status: error.status }),
      ...(error.code === undefined
        ? {}
        : { upstreamCode: error.code }),
      ...(error.resource === undefined
        ? {}
        : { resource: error.resource }),
      message: error.message,
    }
  }

  return {
    event: 'error',
    code: 'UNKNOWN',
    message: error instanceof Error
      ? error.message
      : String(error),
  }
}

/**
 * 富化原始推文，并附带被引用推文。
 *
 * 与应用的 `enrichWithQuoted` 等价；这里不自动请求 Space 元数据，避免
 * 查询命令隐式多打一次上游。
 */
export function enrich(raw: RawTweet, logger?: RettiwtPoolLogger): EnrichedTweet | null {
  const tweet = enrichTweet(raw, undefined, logger && { warn: logger.warn })
  if (!tweet)
    return null

  if (raw.quoted_status_result?.result) {
    const quoted = enrichTweet(raw.quoted_status_result.result, undefined, logger && { warn: logger.warn })
    if (quoted)
      tweet.quotedTweet = quoted
  }

  return tweet
}
