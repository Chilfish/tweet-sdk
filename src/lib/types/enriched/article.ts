/**
 * X Article (long-form post) data.
 *
 * Article tweets carry no body in `legacy.full_text` — only a t.co link to the
 * article page. The body comes from the tweet's `article` node:
 * - `withArticleRichContentState` → Draft.js `content_state` (block document)
 * - `withArticlePlainText` → `plain_text` (plain fallback)
 */
export interface TweetArticle {
  id: string
  url: string
  title: string
  previewText?: string
  plainText?: string
  /** `rich` means `blocks` is available; `plain` only has text. */
  format: 'rich' | 'plain'
  coverImage?: ArticleMedia
  publishedAt?: number
  blocks?: ArticleBlock[]
}

export interface ArticleMedia {
  id: string
  url: string
  width?: number
  height?: number
  alt?: string
}

export type ArticleInlineStyle = 'bold' | 'italic' | 'strikethrough'

export type ArticleRun = {
  text: string
  styles?: ArticleInlineStyle[]
} & (
  | { type: 'text' }
  | { type: 'link', url: string }
  | { type: 'mention' | 'hashtag', href: string }
)

export type ArticleBlock
  = | { key: string, type: 'paragraph', runs: ArticleRun[] }
    | { key: string, type: 'heading', level: 1 | 2 | 3, runs: ArticleRun[] }
    | { key: string, type: 'list-item', ordered: boolean, runs: ArticleRun[] }
    | { key: string, type: 'quote', runs: ArticleRun[] }
    | { key: string, type: 'markdown', text: string }
    | { key: string, type: 'divider' }
    | { key: string, type: 'image', media: ArticleMedia, caption?: string }
    | { key: string, type: 'embed-tweet', tweetId: string }
    | { key: string, type: 'link', url: string }
    | { key: string, type: 'unknown', text?: string }
