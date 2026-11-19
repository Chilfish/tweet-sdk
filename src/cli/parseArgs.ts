/**
 * Parse positive integer CLI arguments (page numbers / counts, etc.).
 *
 * Invalid values (empty string, non-numeric, `< 1`) return `undefined` so the caller treats them as
 * "not specified", avoiding passing values like `0` through to upstream endpoints that count from 1.
 */
export function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '')
    return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1)
    return undefined
  return Math.floor(parsed)
}

/** Parse a non-negative integer that allows 0 (retry counts, etc.). */
export function parseNonNegativeInt(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '')
    return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0)
    return undefined
  return Math.floor(parsed)
}
