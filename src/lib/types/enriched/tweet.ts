import type { MediaDetails } from './media'
import type { TweetUser } from './user'

export interface TweetEditControl {
  edit_tweet_ids: string[]
  editable_until_msecs: string
  is_edit_eligible: boolean
  edits_remaining: string
}

/** Information shared by a tweet, a parent tweet and a quoted tweet. */
export interface TweetBase {
  lang: string
  /** ISO 8601 creation date. */
  created_at: string
  entities: unknown[]
  /** The unique identifier of the tweet. */
  id: string
  text: string
  user: TweetUser
  edit_control: TweetEditControl
  isEdited: boolean
  isStaleEdit: boolean
  in_reply_to_status_id_str?: string
  in_reply_to_screen_name?: string
}

export interface Tweet extends TweetBase {
  __typename: 'Tweet'
  mediaDetails?: MediaDetails[]
  quoted_tweet?: QuotedTweet
  possibly_sensitive?: boolean
  card?: unknown
}

export interface TweetParent extends TweetBase {
  reply_count: number
  retweet_count: number
  favorite_count: number
}

export interface QuotedTweet extends TweetBase {
  reply_count: number
  retweet_count: number
  favorite_count: number
  mediaDetails?: MediaDetails[]
  self_thread: {
    id_str: string
  }
}
