export interface HashtagEntity {
  text: string
}

export interface UserMentionEntity {
  id_str: string
  name: string
  screen_name: string
}

export interface MediaEntity {
  display_url: string
  expanded_url: string
  url: string
}

export interface UrlEntity {
  display_url: string
  expanded_url: string
  url: string
}

export interface SymbolEntity {
  text: string
}

export interface MediaAltEntity {
  text: string
}

export interface SeparatorEntity {
  text: string
  mediaIndex?: number
}

interface TextEntity {
  type: 'text'
}

/** Internal union used while splicing the text into entities. */
export type EntityWithType
  = | TextEntity
    | (HashtagEntity & { type: 'hashtag' })
    | (UserMentionEntity & { type: 'mention' })
    | (UrlEntity & { type: 'url' })
    | (MediaEntity & { type: 'media' })
    | (SymbolEntity & { type: 'symbol' })
    | (MediaAltEntity & { type: 'media_alt' })
    | (SeparatorEntity & { type: 'separator' })

export interface EntityBase {
  text: string
  translation?: string
  aiTranslation?: string
  index: number
}

/** Final entity stream rendered by `TweetBody`. */
export type Entity = EntityBase & (
  | TextEntity
  | (HashtagEntity & { type: 'hashtag', href: string })
  | (UserMentionEntity & { type: 'mention', href: string })
  | (UrlEntity & { type: 'url', href: string })
  | (MediaEntity & { type: 'media', href: string })
  | (SymbolEntity & { type: 'symbol', href: string })
  | (MediaAltEntity & { type: 'media_alt' })
  | (SeparatorEntity & { type: 'separator' })
)

/** Entity shape persisted as a translation result. */
export type TranslationEntity = EntityBase & (
  | TextEntity
  | (HashtagEntity & { type: 'hashtag', href: string })
  | (MediaAltEntity & { type: 'media_alt' })
  | (SeparatorEntity & { type: 'separator' })
)
