import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 极简 `.env` 读取：只支持 `KEY=VALUE`、`#` 注释、单双引号包裹。
 *
 * 不引入 dotenv：CLI 只需要读 `TWEET_KEYS` / `http_proxy` 这类简单值，
 * 且显式 `--keys` / `--cookie` 永远优先。
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

/** 解析 `--env-file` 路径（相对路径按 cwd 解析），默认 `<pwd>/.env`。 */
export function getEnvFilePath(value: unknown): string {
  return typeof value === 'string' && value.trim() !== ''
    ? resolve(process.cwd(), value)
    : resolve(process.cwd(), '.env')
}
