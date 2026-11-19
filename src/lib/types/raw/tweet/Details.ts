/**
 * The raw data received when fetching the details of a given tweet.
 *
 * @public
 */
export interface ITweetDetailsResponse {
  data: Data
}

interface Data {
  tweetResult: TweetResult
}

interface TweetResult {
  result: Result
}

interface Result {
  __typename: string
  rest_id: string
  has_birdwatch_notes: boolean
  core: Core
  unmention_data: UnmentionData
  edit_control: EditControl
  is_translatable: boolean
  views: Views
  source: string
  note_tweet: NoteTweet
  legacy: Legacy2
  quick_promote_eligibility: QuickPromoteEligibility
  in_reply_to_screen_name?: string
  in_reply_to_status_id_str?: string
  quoted_status_result?: TweetResult
  card?: any
  /**
   * X Article (long-form) attachment. With the `withArticleRichContentState` field toggle
   * on, `article_results.result.content_state` carries the Draft.js block document;
   * `withArticlePlainText` only carries the `plain_text` body. Fetching both lets each
   * serve as the other's fallback.
   */
  article?: {
    article_results?: {
      result?: RawArticleResult
    }
  }
  /** JetFuel attachment (returned when responsive_web_jetfuel_frame is on): the full data behind the official rendered card */
  jetfuel_attachment?: {
    height: number
    payload: string
  }
  tombstone?: {
    __typename: 'TextTombstone'
  }
}

interface Core {
  user_results: UserResults
}

interface UserResults {
  result: Result2
}

interface Result2 {
  __typename: string
  id: string
  rest_id: string
  affiliates_highlighted_label: AffiliatesHighlightedLabel
  has_graduated_access: boolean
  is_blue_verified: boolean
  profile_image_shape: string
  legacy: Legacy
  professional: Professional
  verified_phone_status: boolean
  core: {
    created_at: string
    name: string
    screen_name: string
  }
  avatar: {
    image_url: string
  }

  verification: {
    verified: boolean
    verified_type?: 'Business' | 'Government'
  }
}

interface AffiliatesHighlightedLabel {}

interface Legacy {
  can_dm: boolean
  can_media_tag: boolean
  created_at: string
  default_profile: boolean
  default_profile_image: boolean
  description: string
  entities: Entities
  fast_followers_count: number
  favourites_count: number
  followers_count: number
  friends_count: number
  has_custom_timelines: boolean
  is_translator: boolean
  listed_count: number
  location: string
  media_count: number
  name: string
  normal_followers_count: number
  pinned_tweet_ids_str: string[]
  possibly_sensitive: boolean
  profile_image_url_https: string
  profile_interstitial_type: string
  screen_name: string
  statuses_count: number
  translator_type: string
  url: string
  verified: boolean
  want_retweets: boolean
  withheld_in_countries: any[]
}

interface Entities {
  description: Description
  url: Url2
}

interface Description {
  urls: Url[]
}

interface Url {
  display_url: string
  expanded_url: string
  url: string
  indices: number[]
}

interface Url2 {
  urls: Url3[]
}

interface Url3 {
  display_url: string
  expanded_url: string
  url: string
  indices: number[]
}

interface Professional {
  rest_id: string
  professional_type: string
  category: Category[]
}

interface Category {
  id: number
  name: string
  icon_name: string
}

interface UnmentionData {}

interface EditControl {
  edit_tweet_ids: string[]
  editable_until_msecs: string
  is_edit_eligible: boolean
  edits_remaining: string
}

interface Views {
  count: string
  state: string
}

interface NoteTweet {
  is_expandable: boolean
  note_tweet_results: NoteTweetResults
}

interface NoteTweetResults {
  result: Result3
}

interface Result3 {
  id: string
  text: string
  entity_set: EntitySet
  richtext: Richtext
  media: Media
}

interface EntitySet {
  user_mentions: any[]
  urls: any[]
  hashtags: any[]
  symbols: any[]
}

interface Richtext {
  richtext_tags: RichtextTag[]
}

interface RichtextTag {
  from_index: number
  to_index: number
  richtext_types: string[]
}

interface Media {
  inline_media: {
    media_id: string
    index: number
  }[]
}

interface Legacy2 {
  bookmark_count: number
  bookmarked: boolean
  created_at: string
  conversation_id_str: string
  display_text_range: number[]
  entities: Entities2
  extended_entities?: Entities2
  favorite_count: number
  favorited: boolean
  full_text: string
  is_quote_status: boolean
  lang: string
  quote_count: number
  reply_count: number
  retweet_count: number
  retweeted: boolean
  user_id_str: string
  id_str: string
  retweeted_status_result?: TweetResult
  possibly_sensitive?: boolean
  in_reply_to_status_id_str?: string
}

interface Entities2 extends EntitySet {
  media: MediaEntity[]
}

interface QuickPromoteEligibility {
  eligibility: string
}

export interface MediaEntity {
  display_url: string
  expanded_url: string
  ext_alt_text?: string
  id_str: string
  indices: [number, number]
  media_key: string
  media_url_https: string
  type: string
  url: string
  ext_media_availability: ExtMediaAvailability
  sizes: Sizes
  original_info: OriginalInfo
  allow_download_status: AllowDownloadStatus
  media_results: MediaResults
  additional_media_info?: AdditionalMediaInfo
  video_info?: VideoInfo
}

export interface ExtMediaAvailability {
  status: string
}

export interface Sizes {
  large: Large
  medium: Medium
  small: Small
  thumb: Thumb
}

export interface Large {
  h: number
  w: number
  resize: string
}

export interface Medium {
  h: number
  w: number
  resize: string
}

export interface Small {
  h: number
  w: number
  resize: string
}

export interface Thumb {
  h: number
  w: number
  resize: string
}

export interface OriginalInfo {
  height: number
  width: number
  focus_rects: FocusRect[]
}

export interface FocusRect {
  x: number
  y: number
  w: number
  h: number
}

export interface AllowDownloadStatus {
  allow_download: boolean
}

export interface MediaResults {
  result: {
    media_key: string
  }
}

export interface AdditionalMediaInfo {
  monetizable: boolean
}

export interface VideoInfo {
  aspect_ratio: number[]
  duration_millis: number
  variants: Variant[]
}

export interface Variant {
  content_type: 'video/mp4' | 'application/x-mpegURL'
  url: string
  bitrate?: number
}

// ─── X Article (long-form) raw nodes ────────────────────────

/** Media embedded in an article (`media_entities[]` / `cover_media`); fields are optional and vary by upstream */
export interface RawArticleMedia {
  id?: string
  media_id?: string
  media_key?: string
  media_info?: {
    __typename?: string
    original_img_url?: string
    original_img_width?: number
    original_img_height?: number
  }
}

/** Draft.js inline style range (`style` is observed as `Bold` / `Italic` / `Strikethrough`) */
export interface RawArticleInlineStyleRange {
  offset: number
  length: number
  style?: string
}

/** Draft.js entity reference range (`key` points into `entityMap`) */
export interface RawArticleEntityRange {
  key: number | string
  offset: number
  length: number
}

/** @mention / #hashtag span inside a block's `data` (offsets given directly, bypassing entityMap) */
export interface RawArticleSpan {
  fromIndex?: number
  toIndex?: number
  text?: string
}

export interface RawArticleBlock {
  key?: string
  text?: string
  type?: string
  data?: {
    mentions?: RawArticleSpan[]
    hashtags?: RawArticleSpan[]
    [key: string]: unknown
  }
  entityRanges?: RawArticleEntityRange[]
  inlineStyleRanges?: RawArticleInlineStyleRange[]
}

export interface RawArticleEntityValue {
  type?: string
  mutability?: string
  data?: {
    url?: string
    markdown?: string
    tweetId?: string
    /** Both the snake_case used for writes and the camelCase used for reads may appear */
    mediaItems?: Array<{ mediaId?: string, localMediaId?: string, mediaCategory?: string }>
    media_items?: Array<{ media_id?: string, local_media_id?: string, media_category?: string }>
    caption?: string
    [key: string]: unknown
  }
}

export interface RawArticleEntity {
  key?: string | number
  value?: RawArticleEntityValue
}

export interface RawArticleContentState {
  /** Array form; a Record form keyed by key has also been seen */
  entityMap?: RawArticleEntity[] | Record<string, RawArticleEntityValue>
  blocks?: RawArticleBlock[]
}

export interface RawArticleResult {
  id?: string
  rest_id?: string
  title?: string
  preview_text?: string
  plain_text?: string
  cover_media?: RawArticleMedia
  media_entities?: RawArticleMedia[]
  content_state?: RawArticleContentState
  metadata?: {
    first_published_at_secs?: number
    [key: string]: unknown
  }
}
