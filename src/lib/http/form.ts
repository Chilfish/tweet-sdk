/**
 * `application/x-www-form-urlencoded` serialization without `node:querystring`.
 * Uses `encodeURIComponent` so the output matches Node's querystring encoding.
 */
export function stringifyForm(data: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null)
      continue
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  }
  return parts.join('&')
}
