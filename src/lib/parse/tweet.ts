import type {
  CardCarouselImage,
  EnrichedTweet,
  LinkPreviewCard,
  MediaDetails,
  RawTweet,
  TweetUser,
} from '../types/enriched'
import type { Logger } from '../types/Logger'
import { base64ToBytes } from '../http/base64'
import { normalizeProfileImageUrl } from '../media-url'
import { mapArticle } from './article'
import { getEntities } from './entities'
import { parseTrendingCard } from './jetfuel'
import { mapPollCard } from './poll'

/**
 * Enriches a tweet with additional data used to more easily use the tweet in a UI.
 */
export type ParseLogger = Logger

export function enrichTweet(sourceData: RawTweet, retweetedOriginalId?: string, logger?: ParseLogger): EnrichedTweet | null {
  if (!sourceData || sourceData?.__typename === 'TweetTombstone')
    return null

  if (sourceData.legacy?.retweeted_status_result) {
    return enrichTweet(sourceData.legacy.retweeted_status_result.result, sourceData.legacy.id_str, logger)
  }

  const tweet = ('tweet' in sourceData
    ? sourceData.tweet
    : sourceData) as RawTweet
  const userBase = transformUserResponse(tweet)
  if (!userBase)
    return null
  const userScreenName = userBase.screen_name
  const user = userBase

  const tweetId = tweet.rest_id
  const tweetUrl = `https://twitter.com/${userScreenName}/status/${tweetId}`

  const text = tweet.note_tweet?.note_tweet_results?.result?.text || tweet.legacy.full_text
  const entities = getEntities(tweet, text)

  return {
    id: tweet.rest_id,
    lang: tweet.legacy.lang,
    url: tweetUrl,
    created_at: tweet.legacy.created_at,
    __typename: 'Tweet',
    text,
    user,
    in_reply_to_status_id_str: tweet.legacy.in_reply_to_status_id_str,
    in_reply_to_screen_name: (tweet.legacy as any).in_reply_to_screen_name,
    parent_id: tweet.legacy.in_reply_to_status_id_str,
    entities,
    quotedTweetId: tweet.quoted_status_result?.result?.rest_id,
    card: mapTwitterCard(tweet.card, (tweet as any).jetfuel_attachment, logger),
    poll: mapPollCard(tweet.card),
    article: mapArticle(tweet, entities) ?? undefined,
    mediaDetails: mapMediaDetails(tweet),
    retweetedOriginalId,
    isInlineMedia: !!tweet.note_tweet?.note_tweet_results?.result?.media?.inline_media?.length,
    replyCount: tweet.legacy.reply_count ?? 0,
    likeCount: tweet.legacy.favorite_count ?? 0,
    retweetCount: tweet.legacy.retweet_count ?? 0,
    viewCount: Number(tweet.views?.count) || 0,
    // photos: mapPhotoEntities(tweet),
    // video: mapVideoEntities(tweet),
    // parent: parentTweet(tweet),
  }
}

export function transformUserResponse(sourceData: RawTweet): TweetUser | null {
  const rawUser = sourceData?.core?.user_results?.result as any
  const legacy = rawUser?.legacy
  const core = rawUser?.core

  if (!rawUser || !legacy || !core)
    return null

  const transformedUser = {
    id: rawUser.rest_id,
    name: core.name,
    screen_name: core.screen_name,
    is_blue_verified: rawUser.is_blue_verified,
    profile_image_shape: rawUser.profile_image_shape as TweetUser['profile_image_shape'],
    verified: legacy.verified,
    verified_type: legacy.verified_type || rawUser.verification?.verified_type,
    profile_image_url_https: normalizeProfileImageUrl(
      rawUser.avatar?.image_url ?? legacy.profile_image_url_https ?? '',
    ),
  }

  return transformedUser
}

// Unified image key priority list, ordered from highest to lowest resolution
const IMAGE_KEYS_PRIORITY = [
  // Unified / Large
  'photo_image_full_size_original',
  'photo_image_full_size_large',
  'photo_image_full_size',
  // Summary
  'thumbnail_image_original',
  'thumbnail_image_large',
  'thumbnail_image',
  // Player
  'player_image_original',
  'player_image_large',
  'player_image',
  // Fallback
  'summary_photo_image_original',
  'summary_photo_image_large',
  'summary_photo_image',
]

/**
 * Helper: pulls a string value out of the binding_values Map
 */
const getStr = (map: Map<string, any>, key: string): string | undefined => map.get(key)?.string_value

/**
 * Helper: picks the best image URL out of the binding_values Map by priority
 */
function getBestImage(map: Map<string, any>): string | undefined {
  for (const key of IMAGE_KEYS_PRIORITY) {
    const img = map.get(key)?.image_value
    if (img?.url)
      return img.url
  }
  return undefined
}

/** Zero-width characters (the official empty title often uses a \u200b placeholder); empty after cleaning counts as no title */
const INVISIBLE_CHARS_RE = /[\u200B-\u200D\uFEFF]/g
/** The `3_` / `13_` prefix on media ids (the media_entities keys of some variants omit it) */
const MEDIA_ID_PREFIX_RE = /^\d+_/

function cleanCardText(value?: string): string | undefined {
  if (typeof value !== 'string')
    return undefined
  const cleaned = value.replace(INVISIBLE_CHARS_RE, '').trim()
  return cleaned || undefined
}

/** CTA enum → English label (unknown values are kept as-is) */
const CTA_LABELS: Record<string, string> = {
  learn_more: 'Learn more',
  visit: 'Visit',
  shop_now: 'Shop now',
  book_now: 'Book now',
  sign_up: 'Sign up',
  download: 'Download',
  install: 'Install',
  watch: 'Watch',
  listen: 'Listen',
  get_offer: 'Get offer',
  order_now: 'Order now',
  shop: 'Shop',
  play: 'Play',
}

function mapCtaLabel(raw?: string): string | undefined {
  if (!raw)
    return undefined
  return CTA_LABELS[raw] ?? raw
}

function rgbToHex(rgb?: {
  r?: number
  g?: number
  b?: number
  red?: number
  green?: number
  blue?: number
}): string | undefined {
  // The official mediaColor uses red/green/blue, some caches use r/g/b
  const r = rgb?.r ?? rgb?.red
  const g = rgb?.g ?? rgb?.green
  const b = rgb?.b ?? rgb?.blue
  if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number')
    return undefined
  return `#${[r, g, b]
    .map(c => Math.round(c).toString(16).padStart(2, '0'))
    .join('')}`
}

/** A single media_list item / media component item → carousel image (null when the entity is missing) */
function toCardImage(
  item: any,
  entities: Record<string, any>,
  destinations: Record<string, any>,
): CardCarouselImage | null {
  const id = typeof item === 'string'
    ? item
    : item?.id
  const entity = (id && (entities[id] ?? entities[`3_${id}`] ?? entities[id.replace(MEDIA_ID_PREFIX_RE, '')]))
    ?? (typeof item === 'object'
      ? item
      : undefined)
  if (!entity?.media_url_https)
    return null

  const origin = entity.original_info ?? entity.sizes?.large
  const destinationId = typeof item === 'object'
    ? item.destination
    : undefined
  const href = destinationId
    ? destinations[destinationId]?.data?.url_data?.url
    : undefined
  const palette = entity.ext?.mediaColor?.r?.ok?.palette
  const color = palette?.[0]?.rgb
    ? rgbToHex(palette[0].rgb)
    : undefined

  // Video: media_url_https is the poster frame; the playback sources are kept for downstream (downloads / a future player), the UI does not render them yet
  const isVideo = entity.type === 'video' || entity.type === 'animated_gif'
  const variants = Array.isArray(entity.video_info?.variants)
    ? entity.video_info.variants
    : []
  const mp4 = variants
    .filter((v: any) => v?.content_type === 'video/mp4' && v?.url)
    .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0]
    ?.url
  const hls = variants.find(
    (v: any) => v?.content_type === 'application/x-mpegURL' && v?.url,
  )?.url
  const durationMs = entity.video_info?.duration_millis ?? entity.video_info?.duration_ms

  return {
    url: entity.media_url_https,
    width: origin?.width ?? origin?.w ?? 0,
    height: origin?.height ?? origin?.h ?? 0,
    ...(href
      ? { href }
      : {}),
    ...(color
      ? { color }
      : {}),
    ...(isVideo
      ? {
          type: 'video' as const,
          ...((mp4 || hls || typeof durationMs === 'number')
            ? {
                video: {
                  ...(mp4
                    ? { mp4 }
                    : {}),
                  ...(hls
                    ? { hls }
                    : {}),
                  ...(typeof durationMs === 'number'
                    ? { durationMs }
                    : {}),
                },
              }
            : {}),
        }
      : {}),
  }
}

/**
 * Walks the media components in the order declared by `components` (falling back to object key order when absent):
 * - multiple images: `swipeable_media.data.media_list` (the order must follow media_list, not object key order)
 * - single image: `media_1.data.{id,destination}` / `media_id` / inline `media` (`image_website`)
 */
function mapCardMedia(data: any): CardCarouselImage[] {
  const components = data.component_objects || {}
  const entities = data.media_entities || {}
  const destinations = data.destination_objects || {}
  const declaredOrder: string[] = Array.isArray(data.components)
    ? data.components
    : []
  const names: string[] = [
    ...declaredOrder.filter(name => components[name]),
    ...Object.keys(components).filter(name => !declaredOrder.includes(name)),
  ]

  const images: CardCarouselImage[] = []
  for (const name of names) {
    const compData = components[name]?.data
    if (!compData)
      continue

    if (Array.isArray(compData.media_list)) {
      for (const item of compData.media_list) {
        const image = toCardImage(item, entities, destinations)
        if (image)
          images.push(image)
      }
      continue
    }

    // Single media component: media_1 / the media_id of media_with_details_horizontal
    const singleItem = compData.media
      ?? (compData.id || compData.media_id
        ? { ...compData, id: compData.id ?? compData.media_id }
        : undefined)
    if (!singleItem)
      continue

    const image = toCardImage(singleItem, entities, destinations)
    if (image)
      images.push(image)
  }
  return images
}

/**
 * Helper: parses the complex JSON of a Unified Card (YouTube / Trending / single image / multi-image carousel, etc.)
 *
 * Supported component layouts:
 * - `details` layout (YouTube, etc.): `component_objects.details_1.data.{title,subtitle}`
 * - `media_with_details_horizontal` layout (in-X Trending/topic cards):
 *   `component_objects.media_with_details_horizontal_1.data.topic_detail.{title,subtitle}`
 * - `image_carousel_website` layout (multi-image ad cards): `swipeable_media.data.media_list`
 * - `image_website` layout (single-image ad cards): `media_1.data.{id,destination}`
 *
 * Title/description are extracted by walking every component; the domain prefers the
 * destination's `url_data.vanity` (all real X cards carry it), falling back to the
 * subtitle for the old `details` layout when there is no vanity.
 */
interface ParsedUnifiedCard {
  title?: string
  description?: string
  domain?: string
  url?: string
  imageUrl?: string
  layout: 'default' | 'image_card' | 'image_carousel' | 'video_card'
  images?: CardCarouselImage[]
  mediaFirst?: boolean
  ctaLabel?: string
}

function parseUnifiedCard(jsonStr: string | undefined): ParsedUnifiedCard | null {
  if (!jsonStr)
    return null
  try {
    const data = JSON.parse(jsonStr)

    let title: string | undefined
    let description: string | undefined
    let subtitle: string | undefined // the details layout's subtitle acts as the domain in the old behavior

    // Walk every component, supporting details / media_with_details_horizontal and other layouts
    for (const component of Object.values(data.component_objects || {})) {
      const compData = (component as any)?.data
      if (!compData)
        continue
      const topic = compData.topic_detail
      title ??= cleanCardText(topic?.title?.content ?? compData.title?.content)
      description ??= cleanCardText(topic?.subtitle?.content)
      subtitle ??= cleanCardText(compData.subtitle?.content)
    }

    // Target URL and domain: prefer the browser destination's url_data
    const destinations = Object.values(data.destination_objects || {}) as any[]
    const browser = destinations.find(d => d?.type === 'browser') ?? destinations[0]
    const urlData = browser?.data?.url_data

    const images = mapCardMedia(data)
    const legacyMedia = Object.values(data.media_entities || {})[0] as any

    const declaredOrder: string[] = Array.isArray(data.components)
      ? data.components
      : []
    const cardType = typeof data.type === 'string'
      ? data.type
      : ''
    const isCarousel = cardType.startsWith('image_carousel')
    // image_* → image card (single image at the original aspect ratio / multi-image carousel); video_* → video card
    const layout = isCarousel
      ? 'image_carousel' as const
      : cardType.startsWith('video_')
        ? 'video_card' as const
        : cardType.startsWith('image_') || images.length > 1
          ? 'image_card' as const
          : 'default' as const

    const isMediaComponent = (compData: any): boolean =>
      Array.isArray(compData?.media_list) || !!(compData?.media || compData?.id || compData?.media_id)
    const mediaIndex = declaredOrder.findIndex(
      name => isMediaComponent(data.component_objects?.[name]?.data),
    )
    const detailsIndex = declaredOrder.findIndex((name) => {
      const compData = data.component_objects?.[name]?.data
      return !!(compData?.title || compData?.subtitle || compData?.topic_detail)
    })
    const mediaFirst = mediaIndex === -1 || detailsIndex === -1 || mediaIndex < detailsIndex
    const ctaLabel = mapCtaLabel(data.experiment_signals?.website_cta_card_label)

    return {
      title,
      description,
      // Domain prefers url_data.vanity; fall back to subtitle for the old details layout
      domain: urlData?.vanity ?? subtitle,
      url: urlData?.url,
      // The primary image matches the carousel's first frame, not the first object key of media_entities
      imageUrl: images[0]?.url ?? legacyMedia?.media_url_https,
      layout,
      ...(images.length
        ? { images }
        : {}),
      ...(layout !== 'default'
        ? { mediaFirst }
        : {}),
      ...(ctaLabel
        ? { ctaLabel }
        : {}),
    }
  }
  catch {
    return null
  }
}

export function mapTwitterCard(
  cardData: any,
  jetfuelAttachment?: { payload?: string } | null,
  logger?: ParseLogger,
): LinkPreviewCard | undefined {
  if (!cardData)
    return undefined

  // Data normalization: pull out the core name and binding_values regardless of the old or new shape
  const legacy = cardData.legacy || cardData
  const name = legacy.name
  const bindingValues = legacy.binding_values

  if (!name || !Array.isArray(bindingValues))
    return undefined

  // 2. Turn binding_values into a Map for fast lookups (O(1))
  const bindings = new Map(bindingValues.map((v: any) => [v.key, v.value]))

  // 3. Basic field extraction
  let card: LinkPreviewCard = {
    type: name === 'player'
      ? 'summary_large_image'
      : name, // Player cards are uniformly treated as large image cards
    url: legacy.url || getStr(bindings, 'card_url') || '',
    title: cleanCardText(getStr(bindings, 'title')) ?? '',
    description: cleanCardText(getStr(bindings, 'description')) ?? '',
    // Domain prefers the vanity_url used for official display (youtube.com); domain carries a www prefix
    domain: getStr(bindings, 'vanity_url') || getStr(bindings, 'domain') || '',
    imageUrl: getBestImage(bindings) ?? '',
    // Layout marker: anything that is not unified_card is treated as a plain card; old caches lack this field, which triggers a backfill
    layout: 'default',
  }

  // 4. Special handling for Unified Card (overrides the extraction above)
  if (name === 'unified_card') {
    const unifiedData = parseUnifiedCard(getStr(bindings, 'unified_card'))
    if (unifiedData) {
      // Only override fields that are not undefined, so description and friends are not wiped by undefined
      card = {
        ...card,
        ...Object.fromEntries(Object.entries(unifiedData).filter(([, v]) => v !== undefined)),
      }
    }
  }

  // 4.5 jetfuel enhancement: parse the responsive_web_jetfuel_frame attachment data (full data for Trending/topic cards)
  if (jetfuelAttachment?.payload) {
    const trending = parseTrendingCard(jetfuelAttachment.payload)
    if (trending) {
      // Prefer the jetfuel data (the same source the official renderer uses; it carries fresher descriptions/images plus category/avatars/posts count)
      card = {
        ...card,
        url: trending.url || card.url,
        imageUrl: trending.imageUrl || card.imageUrl,
        title: trending.title || card.title,
        description: trending.description || card.description,
        domain: card.domain || getDomainFromUrl(trending.url) || '',
        layout: 'trending',
        trending,
      }
    }
    else {
      // Parse failure: fall back to the unified_card result and tell the developer the payload structure has changed
      logger?.warn?.('jetfuel.parse.fallback', {
        card: name,
        payloadHash: hashPayload(jetfuelAttachment.payload),
        reason: 'payload did not yield url/image/title',
      })
    }
  }

  // 5. Final validation and cleanup
  // There must be at least a title or a description or an image
  if (!card.title && !card.description && !card.imageUrl) {
    return undefined
  }

  // Domain fallback logic
  if (!card.domain && card.url) {
    try {
      card.domain = new URL(card.url).hostname
    }
    catch {}
  }

  return card
}

/** Lightweight payload fingerprint (first 8B of base64), used to identify the structure version in logs */
function hashPayload(payload: string): string {
  const head = base64ToBytes(payload.slice(0, 12))
  return Array.from(head.subarray(0, 8)).map(x => x.toString(16).padStart(2, '0')).join('')
}

function getDomainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname
  }
  catch {
    return null
  }
}

export function mapMediaDetails(tweet: RawTweet): MediaDetails[] | undefined {
  const mediaEntities = tweet.legacy.entities?.media
  if (!mediaEntities || mediaEntities.length === 0)
    return undefined

  const noteMedia = tweet.note_tweet?.note_tweet_results?.result?.media?.inline_media || []

  return mediaEntities.map((media, idx) => {
    const mediaNoteIdx = noteMedia.findIndex(m => m.media_id === media.id_str)
    const mediaIdx = mediaNoteIdx === -1
      ? idx
      : mediaNoteIdx

    const baseMedia = {
      index: mediaIdx,
      media_url_https: media.media_url_https,
      original_info: {
        height: media.original_info.height,
        width: media.original_info.width,
      },
    }

    if (media.type === 'photo') {
      return {
        ...baseMedia,
        type: 'photo' as const,
        ext_alt_text: media.ext_alt_text,
      }
    }

    if (media.type === 'animated_gif' && media.video_info) {
      return {
        ...baseMedia,
        type: 'animated_gif' as const,
        video_info: {
          duration: media.video_info.duration_millis || 0,
          aspect_ratio: [
            media.video_info.aspect_ratio[0] || 1,
            media.video_info.aspect_ratio[1] || 1,
          ] as [number, number],
          variants: media.video_info.variants,
        },
      }
    }

    if (media.type === 'video' && media.video_info) {
      return {
        ...baseMedia,
        type: 'video' as const,
        video_info: {
          duration: media.video_info.duration_millis || 0,
          aspect_ratio: [
            media.video_info.aspect_ratio[0] || 1,
            media.video_info.aspect_ratio[1] || 1,
          ] as [number, number],
          variants: [
            media.video_info.variants.at(-1)!,
          ],
        },
      }
    }

    // Fallback: return the photo type by default to stay type-safe
    return {
      ...baseMedia,
      type: 'photo' as const,
    }
  })
    .sort((a, b) => a.index - b.index)
}
