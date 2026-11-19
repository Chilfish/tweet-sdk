import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Minimal `.env` reader: supports only `KEY=VALUE`, `#` comments, and single/double-quoted values.
 *
 * No dotenv dependency: the CLI only needs simple values like `TWEET_KEYS` / `http_proxy`,
 * and explicit `--keys` / `--cookie` always take precedence.
 */
export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path))
    return {}

  const values: Record<string, string> = {}
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#'))
      continue

    const separator = line.indexOf('=')
    if (separator < 1)
      continue

    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')))
      value = value.slice(1, -1)

    if (key)
      values[key] = value
  }

  return values
}

/** Resolve the `--env-file` path (relative paths resolve against cwd); defaults to `<pwd>/.env`. */
export function getEnvFilePath(value: unknown): string {
  return typeof value === 'string' && value.trim() !== ''
    ? resolve(process.cwd(), value)
    : resolve(process.cwd(), '.env')
}
