import type { TwitterClient } from '../lib/client'
import type { RettiwtPoolLogger } from '../lib/pool'
import type { EnrichedTweet, RawTweet } from '../lib/types/enriched'
import { TwitterApiError } from '../lib/errors'
import { enrichTweet } from '../lib/parse/tweet'
import { createNodeClient } from '../node'
import { getEnvFilePath, readEnvFile } from './env'
import { CliError } from './error'
import { parsePositiveInt } from './parseArgs'

/** Connection arguments shared by every query command. */
export const clientArg = {
  'keys': {
    type: 'string',
    description: 'API key list (comma-separated base64 cookies; defaults to TWEET_KEYS from --env-file)',
    alias: 'k',
  },
  'cookie': {
    type: 'string',
    description: 'Raw cookie string (k=v; k=v; overrides keys and is base64-encoded automatically)',
  },
  'env-file': {
    type: 'string',
    description: 'Env file path (default <pwd>/.env; reads TWEET_KEYS / http_proxy)',
  },
  'proxy': {
    type: 'string',
    description: 'HTTP(S) proxy URL (defaults to http_proxy / HTTPS_PROXY from --env-file)',
    alias: 'p',
  },
  'timeout': {
    type: 'string',
    description: 'Per-request timeout in ms (defaults to the runtime / upstream)',
  },
  'verbose': {
    type: 'boolean',
    description: 'Emit pool rotation / parse fallback events as JSON lines on stderr',
    alias: 'v',
  },
} as const

/** `--keys` and `TWEET_KEYS` are both comma-separated; blank entries are dropped. */
function splitKeys(value: string | undefined): string[] {
  if (!value)
    return []
  return value.split(',').map(key => key.trim()).filter(Boolean)
}

/** Pool logger used with `--verbose`: one JSON line per event, easy to collect. */
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
 * Build a client from CLI arguments.
 *
 * Precedence:
 * - keys: `--keys` → `--cookie` (raw cookie, encoded) → `TWEET_KEYS` from `--env-file`
 * - proxy: `--proxy` → `http_proxy` / `HTTPS_PROXY` from `--env-file`
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
 * Convert any error into the CLI's JSON error envelope (stderr).
 *
 * Core errors additionally carry `status` / `code`, so scripts can decide whether to retry without parsing prose.
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
 * Enrich a raw tweet and attach the quoted tweet.
 *
 * Equivalent to the app's `enrichWithQuoted`; Space metadata is not requested automatically here, so
 * query commands don't silently make an extra upstream call.
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
