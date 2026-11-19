import type { IUser as IRawUser } from '../raw/base/User'
import type { ITweetDetailsResponse } from '../raw/tweet/Details'
import type { TweetArticle } from './article'
import type { LinkPreviewCard } from './card'
import type { Entity } from './entities'
import type { TweetPoll } from './poll'
import type { SpaceDetails } from './space'
import type { Tweet } from './tweet'

export type * from './article'
export type * from './card'
export type * from './entities'
export type * from './media'
export type * from './poll'
export type * from './space'
export type * from './tweet'
export type * from './user'

export type RawTweet = ITweetDetailsResponse['data']['tweetResult']['result']

export type RawUser = IRawUser

export type EnrichedUser = IRawUser & {
  userName?: string
  fullName?: string
  profileImage?: string
  profileBanner?: string
  description?: string
  createdAt?: string
  isVerified?: boolean
  url?: string
  birthdayString?: string
  followingsCount?: number
  followersCount?: number
  statusesCount?: number
  location?: { location?: string }
}

type OmitTypes
  = | 'entities'
    | 'quoted_tweet'
    | 'edit_control'
    | 'isEdited'
    | 'isStaleEdit'
    | 'possibly_sensitive'
    | 'card'

/**
 * The enrichment contract between the core layer and the UI layer.
 *
 * Field naming is normalized here (`id` / `quotedTweet` / `isInlineMedia`) so
 * both consumers adapt once instead of carrying upstream names forever.
 */
export type EnrichedTweet = Omit<Tweet, OmitTypes> & {
  id: string
  url: string
  entities: Entity[]
  /** Parent tweet id when this tweet is a reply. */
  parent_id?: string
  quotedTweetId?: string
  quotedTweet?: EnrichedTweet
  card?: LinkPreviewCard
  /** Poll tweets (X stores the poll inside `card.binding_values`). */
  poll?: TweetPoll
  /** X Article (long-form) data. */
  article?: TweetArticle
  /** X Space card data (only for space cards or bodies linking a Space). */
  space?: SpaceDetails
  /** Id of the retweet event (the retweeted original is `id`). */
  retweetedOriginalId?: string
  isInlineMedia?: boolean
  replyCount?: number
  likeCount?: number
  retweetCount?: number
  viewCount?: number
  comments?: EnrichedTweet[]
}

export type TweetData = EnrichedTweet[]
