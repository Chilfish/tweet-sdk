import type { HttpQueryParams } from './types'

/**
 * Serializes query parameters with `encodeURIComponent` semantics.
 *
 * X's GraphQL endpoints rely on this exact encoding for JSON-encoded
 * `variables` / `features` values; `URLSearchParams` would encode `!`, `'`,
 * `(` and `)` differently and encode spaces as `+`.
 */
export function encodeQueryParams(params?: HttpQueryParams): string {
  if (!params)
    return ''

  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null)
      continue
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  }

  return parts.join('&')
}

/** Appends encoded query parameters to a URL that may already contain a query. */
export function buildUrl(url: string, params?: HttpQueryParams): string {
  const query = encodeQueryParams(params)
  if (!query)
    return url
  return url.includes('?')
    ? `${url}&${query}`
    : `${url}?${query}`
}
