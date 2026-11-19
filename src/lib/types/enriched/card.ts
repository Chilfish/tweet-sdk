/** The card layout inferred from `unified_card.type` / media components. */
export type CardLayout = 'default' | 'image_card' | 'image_carousel' | 'video_card' | 'trending'

/** A single image/video inside an image or carousel card. */
export interface CardCarouselImage {
  url: string
  width: number
  height: number
  href?: string
  /** Dominant colour from `mediaColor`, used as a loading placeholder. */
  color?: string
  type?: 'photo' | 'video'
  video?: {
    mp4?: string
    hls?: string
    durationMs?: number
  }
}

/** jetfuel_attachment payload parsed into the official trending-card fields. */
export interface TrendingCardInfo {
  source: 'jetfuel'
  url: string
  imageUrl: string
  categories: string[]
  avatars: string[]
  postsCount?: string
  title: string
  description?: string
}

/** Normalized link preview card. */
export interface LinkPreviewCard {
  type: 'summary' | 'summary_large_image' | 'unified_card' | 'unknown' | 'player'
  url: string
  title: string
  description: string
  domain: string
  imageUrl: string
  layout?: CardLayout
  images?: CardCarouselImage[]
  mediaFirst?: boolean
  ctaLabel?: string
  trending?: TrendingCardInfo
}
