import type { Entity, RawTweet, TweetArticle } from '../types/enriched'
import type { RawArticleResult } from '../types/raw/tweet/Details'
import { mediaFromRaw, parseContentState } from './article-blocks'

/**
 * Pure mapping logic for X Articles (long-form posts).
 *
 * The body of an article tweet is not in `legacy.full_text`/`note_tweet`, but in a
 * t.co link pointing at the article page; the article itself lives in the tweet's
 * `article` node:
 *
 * ```json
 * { "article": { "article_results": { "result": {
 *   "rest_id": "2104009234858024962", "title": "…", "preview_text": "…",
 *   "plain_text": "…(requires withArticlePlainText)",
 *   "content_state": { "blocks": [...], "entityMap": [...] },   // requires withArticleRichContentState
 *   "media_entities": [...], "cover_media": {...}, "metadata": { "first_published_at_secs": … }
 * } } } }
 * ```
 *
 * Like `space.ts` this is pure mapping with no IO, which keeps it unit-testable. See
 * `~/lib/article/parse` for block parsing.
 */

/** Article link in the body/entities: `x.com/i/article/<id>` or `x.com/<user>/article/<id>` */
const ARTICLE_URL_RE = /^https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/\w+\/article\/(\d+)/

/** Whether this URL points at an X article page (the body uses this to avoid showing the same jump target twice alongside the card) */
export function isArticleUrl(url?: string | null): boolean {
  return typeof url === 'string' && ARTICLE_URL_RE.test(url)
}

/** Extracts the article id from an article link; returns null when it is not an article link */
export function extractArticleIdFromUrl(url?: string | null): string | null {
  if (typeof url !== 'string')
    return null
  return ARTICLE_URL_RE.exec(url)?.[1] ?? null
}

/**
 * Takes the article id from the tweet entities (the fallback when the upstream
 * `article` node is missing, also covering older cache entries).
 */
export function resolveArticleId(entities?: ReadonlyArray<unknown> | null): string | null {
  for (const entity of entities ?? []) {
    const id = extractArticleIdFromUrl((entity as { href?: string } | null | undefined)?.href)
    if (id)
      return id
  }
  return null
}

function toArticleUrl(id: string): string {
  return `https://x.com/i/article/${id}`
}

function articleFromRawResult(result: RawArticleResult, id: string): TweetArticle | null {
  const title = typeof result.title === 'string'
    ? result.title.trim()
    : ''
  const previewText = typeof result.preview_text === 'string' && result.preview_text.trim()
    ? result.preview_text
    : undefined
  const blocks = parseContentState(result.content_state, result.media_entities)
  // When a block document exists it already covers the full text, making `plain_text`
  // fully redundant (long articles can reach tens of KB) — keep the plain text only
  // when there is no block document (plain degradation).
  const plainText = blocks.length === 0 && typeof result.plain_text === 'string' && result.plain_text.trim()
    ? result.plain_text
    : undefined

  if (!title && !previewText && !plainText && blocks.length === 0)
    return null

  const publishedSecs = result.metadata?.first_published_at_secs

  return {
    id,
    url: toArticleUrl(id),
    title,
    previewText,
    plainText,
    format: blocks.length > 0
      ? 'rich'
      : 'plain',
    coverImage: mediaFromRaw(result.cover_media) ?? undefined,
    publishedAt: typeof publishedSecs === 'number' && publishedSecs > 0
      ? publishedSecs * 1000
      : undefined,
    blocks: blocks.length > 0
      ? blocks
      : undefined,
  }
}

/**
 * Maps {@link TweetArticle} out of the tweet's `article` node.
 *
 * Returns null when there is no title/summary/body — better to let the bare link in
 * the body render as usual than to show an empty card (the same trade-off as the
 * final check in `mapTwitterCard`). When only the article link is available (paths
 * such as search/list that do not fetch rich content), the card entry point is
 * provided by {@link resolveArticleLink}.
 */
export function mapArticle(rawTweet: RawTweet | null | undefined, entities?: Entity[]): TweetArticle | null {
  const result = (rawTweet as { article?: { article_results?: { result?: RawArticleResult } } } | null | undefined)
    ?.article
    ?.article_results
    ?.result

  const id = typeof result?.rest_id === 'string' && result.rest_id
    ? result.rest_id
    : resolveArticleId(entities)

  if (!id || !result)
    return null

  return articleFromRawResult(result, id)
}

/**
 * Produces a minimal entry point from the article link in the body alone (`title` is
 * empty).
 *
 * Used by paths that **do not fetch rich content**, such as search / list /
 * user-timeline, to render "X Article → Read full article"; clicking through to
 * `/article/:id` then fetches the full block document.
 */
export function resolveArticleLink(entities?: ReadonlyArray<unknown> | null): TweetArticle | null {
  const id = resolveArticleId(entities)
  if (!id)
    return null
  return {
    id,
    url: toArticleUrl(id),
    title: '',
    format: 'plain',
  }
}
