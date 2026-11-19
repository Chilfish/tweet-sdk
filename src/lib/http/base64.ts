/**
 * Base64 helpers that work without Node's `Buffer`.
 *
 * Cookie payloads are always ASCII, so the binary-string bridge used by
 * `atob` / `btoa` is lossless here.
 */

export function decodeBase64(input: string): string {
  if (!input)
    return ''
  return atob(input)
}

export function encodeBase64(input: string): string {
  if (!input)
    return ''
  return btoa(input)
}

/** Decodes base64 into bytes; returns an empty buffer for invalid input. */
export function base64ToBytes(input: string): Uint8Array {
  if (!/^[A-Z0-9+/]+={0,2}$/i.test(input))
    return new Uint8Array(0)

  const binary = decodeBase64(input)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i)
  return bytes
}
