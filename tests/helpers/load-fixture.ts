import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

interface WrappedFixture {
  _meta?: { source?: string, exportedAt?: string, schema?: string }
  data?: unknown
  testCases?: unknown
}

/**
 * Loads a JSON fixture from `tests/fixtures`.
 *
 * Fixtures are wrapped as `{ _meta, data }`; the wrapper is unwrapped here so
 * tests read the raw upstream payload.
 */
export function loadFixture<T = unknown>(path: string): T {
  const url = new URL(`../fixtures/${path}`, import.meta.url)
  const parsed = JSON.parse(readFileSync(fileURLToPath(url), 'utf-8')) as WrappedFixture
  return (parsed.data ?? parsed.testCases ?? parsed) as T
}
