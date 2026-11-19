/**
 * Parser for `jetfuel_attachment.payload` (pure function, no React dependencies).
 *
 * Format (confirmed via packet capture plus the emusks library docs): X's private
 * "nodal dictionary-compressed frame" —
 * - framing: u16 LE payloadLen + 3 zero bytes + u8 count + payload + 3-byte footer
 * - inline strings: `<len:u8> <utf8 bytes>` (single-byte length prefix, 255B max)
 * - node intro `0x11`: followed by [typeString, keyString]
 * - atom reference `02 <field> 00 00 00 <hash:u32>`; reference list `03 <kind> <count> ...`
 *
 * There is no official public schema (the atom style dictionary lives in a lazily loaded
 * chunk), and string length prefixes cannot be located reliably in the binary stream
 * (emusks' ASCII-only scan cuts long URLs and CJK text in half). So we use two strategies:
 * best-effort structural scanning + **semantic regex extraction as the fallback** —
 * pattern-match URL / CJK fragment / posts count / category words against the fully
 * UTF-8-decoded text, which was observed to hit 100% of this sample (and similar
 * Trending cards). If any key field is missing → return null and let the caller
 * compensate via its own fallback (see the merge strategy in mapTwitterCard).
 */

import type { TrendingCardInfo } from '../types/enriched'
import { base64ToBytes } from '../http/base64'

export interface JetfuelFrame {
  /** Framing info: payload length / node count / footer hex */
  frame: { payloadLen: number | null, count: number | null, footer: string | null }
  /** Extracted readable strings (semantic extraction result) */
  strings: string[]
  /** Node intro 0x11 plus the two strings that immediately follow it [type, key] (best-effort) */
  nodes: Array<{ type: string | null, key: string | null }>
  /** Atom references (fieldId + FarmHash u32; the style dictionary is not parsed) */
  atoms: Array<{ field: number, hash: string }>
  /** Reference lists */
  lists: Array<{ kind: number, count: number }>
}

const decoder = new TextDecoder('utf-8', { fatal: false })

const BASE64_RE = /^[A-Z0-9+/]+={0,2}$/i

export function toBytes(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array)
    return input
  // Strict base64 validation: lenient decoding misparses corrupted payloads
  if (!BASE64_RE.test(input))
    return new Uint8Array(0)
  return base64ToBytes(input)
}

/** Extracts every readable token (URL / CJK text / posts count / words) from a utf8 text */
export function extractJetfuelStrings(input: string | Uint8Array): string[] {
  const b = toBytes(input)
  const n = b.length
  const start = n > 6
    ? 6
    : 0
  const end = n > 3
    ? n - 3
    : n
  const text = decoder.decode(b.subarray(start, end))

  const urls = /https?:\/\/[\w./?=&%+-]+/g
  const cjk = /[\u3000-\u9FFF\uAC00-\uD7AF][\u3000-\u9FFF\uAC00-\uD7AF\w！？…·•,，.]+/g
  const posts = /\d+(\.\d+)?[kKmM]?\s*posts/g
  // Words/structural words: hyphens are allowed (trending-card), but slices that clearly come from a URL are excluded
  const words = /[A-Z][A-Z-]{2,29}/gi

  const out = new Set<string>()
  for (const re of [urls, cjk, posts, words]) {
    for (const m of text.matchAll(re))
      out.add(m[0].trim())
  }
  return [...out]
}

/**
 * Decodes a jetfuel payload into a structured frame. Returns null when it cannot be
 * decoded (not base64 / empty). The structural scan is best-effort: `strings` uses
 * semantic extraction (stable fields), while nodes/atoms/lists are reconstructed as far
 * as possible for debugging.
 */
export function decodeJetfuelPayload(input: string | Uint8Array): JetfuelFrame | null {
  try {
    const b = toBytes(input)
    const n = b.length
    if (n < 6)
      return null

    const frame = {
      payloadLen: n >= 2
        ? (b[0]! | (b[1]! << 8)) || null
        : null,
      count: n >= 6
        ? b[5]!
        : null,
      footer: n >= 3
        ? Array.from(b.subarray(n - 3, n)).map(x => x.toString(16).padStart(2, '0')).join('')
        : null,
    }

    const strings = extractJetfuelStrings(b)
    const nodes: JetfuelFrame['nodes'] = []
    const atoms: JetfuelFrame['atoms'] = []
    const lists: JetfuelFrame['lists'] = []

    // Structural scan: 0x11 nodes / 02 atoms / 03 lists / length-prefixed strings
    const start = n > 6
      ? 6
      : 0
    const end = n > 3
      ? n - 3
      : n
    let i = start
    const tokens: Array<{ type: 'node' | 'atom' | 'list' | 'string' }> = []

    while (i < end - 1) {
      const byte = b[i]!

      if (byte === 0x11) {
        tokens.push({ type: 'node' })
        nodes.push({ type: null, key: null })
        i += 1
        continue
      }
      if (byte === 0x02 && i + 9 <= end && b[i + 2] === 0 && b[i + 3] === 0 && b[i + 4] === 0) {
        const field = b[i + 1]!
        const hash = Array.from(b.subarray(i + 5, i + 9)).map(x => x.toString(16).padStart(2, '0')).join('')
        atoms.push({ field, hash })
        tokens.push({ type: 'atom' })
        i += 9
        continue
      }
      if (byte === 0x03 && i + 7 <= end && b[i + 3] === 0 && b[i + 4] === 0 && b[i + 5] === 0 && b[i + 6] === 0) {
        lists.push({ kind: b[i + 1]!, count: b[i + 2]! })
        tokens.push({ type: 'list' })
        i += 7
        continue
      }
      // Length-prefixed string (single byte; informational only, never used as a field source)
      if (byte >= 1 && byte <= 250 && i + 1 + byte <= end) {
        const seg = b.subarray(i + 1, i + 1 + byte)
        const s = decoder.decode(seg)
        if (!s.includes('\uFFFD') && /[A-Z0-9\u3000-\u9FFF]/i.test(s)) {
          tokens.push({ type: 'string' })
          i += 1 + byte
          continue
        }
      }
      tokens.push({ type: 'string' })
      i += 1
    }

    // Nodes are followed by [typeString, keyString]: associate them in token order (best-effort, debugging only)
    let nodeIdx = 0
    let strIdx = 0
    for (let t = 0; t < tokens.length && nodeIdx < nodes.length; t++) {
      if (tokens[t]!.type === 'node') {
        let key = 0
        for (let u = t + 1; u < tokens.length && key < 2; u++) {
          if (tokens[u]!.type === 'node')
            break
          if (tokens[u]!.type === 'string') {
            if (key === 0)
              nodes[nodeIdx]!.type = strings[strIdx] ?? null
            else
              nodes[nodeIdx]!.key = strings[strIdx] ?? null
            key += 1
            strIdx += 1
          }
        }
        nodeIdx += 1
      }
    }

    return { frame, strings, nodes, atoms, lists }
  }
  catch {
    return null
  }
}

/** Picks the first URL from the string set by inclusion rule (only complete strings starting with http are kept) */
function pickUrl(strings: string[], needle?: string): string | undefined {
  return strings.find(s => s.startsWith('http') && (!needle || s.includes(needle)))
}

/**
 * Parses structured Trending card info out of the payload.
 * If any key field is missing (no URL / no main image / no title) → return null (triggering the caller's fallback).
 */
export function parseTrendingCard(input: string | Uint8Array): TrendingCardInfo | null {
  return buildTrendingCard(extractJetfuelStrings(input))
}

function buildTrendingCard(strings: string[]): TrendingCardInfo | null {
  if (strings.length === 0)
    return null

  const url = pickUrl(strings, 'x.com/') ?? pickUrl(strings)
  const imageUrl = pickUrl(strings, 'pbs.twimg.com/media/') ?? pickUrl(strings, 'pbs.twimg.com')
  if (!url || !imageUrl)
    return null

  const avatars = strings.filter(s => s.includes('profile_images/'))
  // Category: an English-only word with the first letter capitalized and the rest all
  // lowercase (Entertainment / Celebrity, etc.); exclude protocol words, URL slice words,
  // image hash strings (mixed case like HPxZhM) and structural words
  const STRUCT_WORDS = new Set([
    'component',
    'trending',
    'trending-card',
    'https',
    'http',
    'www',
    'com',
    'net',
    'org',
    'pbs',
    'twimg',
    'media',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'name',
    'orig',
    'photo',
    'browser',
    'profile',
    'images',
    'xcom',
  ])
  const categories = strings
    .filter(s => /^[A-Z][a-z]+$/.test(s))
    .filter(s => !STRUCT_WORDS.has(s.toLowerCase()))
    .slice(0, 4)

  const postsCount = strings.find(s => /^\d+(?:\.\d+)?[kKmM]?\s*posts$/.test(s))
  const cjkCount = (s: string): number => (s.match(/[\u3000-\u9FFF\uAC00-\uD7AF]/g) || []).length
  const title = strings.find(s => cjkCount(s) >= 3)
  const descriptions = strings.filter(s => s !== title && cjkCount(s) >= 10)
  const description = descriptions.at(-1)

  if (!title)
    return null

  return {
    source: 'jetfuel',
    url,
    imageUrl,
    categories,
    avatars: avatars.slice(0, 3),
    postsCount,
    title,
    description: description || undefined,
  }
}
