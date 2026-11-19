import type { User } from './models/data/User'
import type { FetcherService } from './services/public/FetcherService'
import type { ITweetFilter } from './types/args/FetchArgs'
import type { RawTweet } from './types/enriched'
import type { IListTweetsResponse } from './types/raw/list/Tweets'
import type { IAudioSpace, IAudioSpaceByIdResponse } from './types/raw/space/Details'
import type { ITweetDetailsResponse } from './types/raw/tweet/Details'
import type { ITweetRepliesResponse } from './types/raw/tweet/Replies'
import type { ITweetSearchResponse } from './types/raw/tweet/Search'

import type { IUserDetailsResponse } from './types/raw/user/Details'
import type { IUserTweetsResponse } from './types/raw/user/Tweets'
import { Extractors } from './collections/Extractors'
import { ResourceType } from './enums/Resource'
import { TweetRepliesSortType } from './enums/Tweet'
import { findByFilter } from './helper/JsonUtils'
import { RettiwtPool } from './pool'

export interface CursoredTweets {
  tweets: RawTweet[]
  nextCursor: string | null
}

export interface ReplyOptions {
  sortBy?: TweetRepliesSortType
  cursor?: string
  count?: number
}

export interface SearchOptions {
  /** `top` for the "Top" tab, `latest` for "Latest" (default). */
  type?: 'top' | 'latest'
  count?: number
  cursor?: string
}

function getBottomCursor(data: unknown): string | null {
  const cursors = findByFilter<{ value?: string }>(data, 'cursorType', 'Bottom')
  const value = cursors.at(-1)?.value
  return value
    ? String(value)
    : null
}

/**
 * Search results may wrap the tweet in `TweetWithVisibilityResults`; unwrap it.
 */
function unwrapSearchTweetResult(result: unknown): RawTweet {
  if (!result || typeof result !== 'object')
    return result as RawTweet

  const wrapped = result as { __typename?: string, tweet?: RawTweet }
  return wrapped.__typename === 'TweetWithVisibilityResults' && wrapped.tweet
    ? wrapped.tweet
    : result as RawTweet
}

/**
 * Parses a `SearchTimeline` response into tweets + next cursor.
 *
 * Pure function so it can be unit-tested without network. Query strings are
 * passed through as-is, so X advanced-search operators work unchanged.
 */
export function parseSearchTimeline(response: ITweetSearchResponse): CursoredTweets {
  const instructions = response.data?.search_by_raw_query?.search_timeline?.timeline?.instructions || []

  const tweets = instructions
    .flatMap(instruction => instruction.entries || [])
    .filter(entry => entry.entryId?.startsWith('tweet-'))
    .filter(entry => entry.content?.entryType !== 'TimelineTimelineCursor')
    .map(entry => unwrapSearchTweetResult(entry.content.itemContent?.tweet_results?.result))
    .filter((tweet): tweet is RawTweet => !!tweet)

  return {
    tweets,
    nextCursor: getBottomCursor(response.data),
  }
}

/**
 * High-level X client: raw fetching for tweets, users, spaces and lists.
 *
 * The pool handles key rotation; enrichment lives in `parse/` and is left to
 * the caller (that is the core ↔ UI contract).
 */
export class TwitterClient {
  public readonly pool: RettiwtPool

  public constructor(keys: string[] | string = [], options: ConstructorParameters<typeof RettiwtPool>[1] = {}) {
    this.pool = new RettiwtPool(Array.isArray(keys)
      ? keys
      : [keys], options)
  }

  /** Fetches a single tweet's raw result. */
  public async getTweet(id: string): Promise<RawTweet> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<ITweetDetailsResponse>(ResourceType.TWEET_DETAILS, { id })
      return response.data.tweetResult.result
    })
  }

  /** Fetches the main tweet plus replies and the next cursor. */
  public async getReplies(tweetId: string, options: ReplyOptions = {}): Promise<CursoredTweets> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<ITweetRepliesResponse>(ResourceType.TWEET_REPLIES, {
        id: tweetId,
        cursor: options.cursor,
        count: options.count,
        sortBy: options.sortBy ?? TweetRepliesSortType.LIKES,
      })

      const instructions = (response.data
        .threaded_conversation_with_injections_v2
        .instructions as any[])
        .filter(instruction => instruction.type === 'TimelineAddEntries')

      const mainTweet = instructions
        .flatMap(instruction => instruction.entries?.filter((entry: any) => entry.content.entryType === 'TimelineTimelineItem') || [])
        .flatMap((entry: any) => entry.content.itemContent?.tweet_results.result)
        .filter(Boolean)
        .at(0) as RawTweet | undefined

      const comments = instructions
        .flatMap(instruction => instruction.entries?.filter((entry: any) => entry.content.entryType === 'TimelineTimelineModule') || [])
        .flatMap((entry: any) => (entry.content.items || []).map((item: any) => item.item.itemContent.tweet_results.result))
        .filter((tweet: unknown): tweet is RawTweet => !!tweet)

      return {
        tweets: [
          ...comments,
          ...(mainTweet
            ? [mainTweet]
            : []),
        ] as RawTweet[],
        nextCursor: getBottomCursor(response.data),
      }
    })
  }

  /** Searches tweets. `query` accepts X advanced-search syntax. */
  public async searchTweets(
    query: string | ITweetFilter,
    options: SearchOptions = {},
  ): Promise<CursoredTweets> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<ITweetSearchResponse>(ResourceType.TWEET_SEARCH, {
        filter: typeof query === 'string'
          ? {
              includeWords: [query],
              top: options.type === 'top',
            }
          : query,
        count: options.count,
        cursor: options.cursor,
      })

      return parseSearchTimeline(response)
    })
  }

  /** Fetches a user by username or numeric id. */
  public async getUser(idOrUsername: string): Promise<User | null> {
    if (!idOrUsername)
      return null

    return this.pool.run(async (fetcher) => {
      const resource = Number.isNaN(Number(idOrUsername))
        ? ResourceType.USER_DETAILS_BY_USERNAME
        : ResourceType.USER_DETAILS_BY_ID

      const response = await fetcher.request<IUserDetailsResponse>(resource, { id: idOrUsername })
      return (Extractors[resource](response) as User | undefined) ?? null
    })
  }

  /** Fetches a user timeline (posts and replies) with a bottom cursor. */
  public async getUserTimeline(userId: string, cursor?: string): Promise<CursoredTweets> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<IUserTweetsResponse>(
        ResourceType.USER_TIMELINE_AND_REPLIES,
        { id: userId, cursor },
      )

      const entries = (response.data.user.result.timeline?.timeline?.instructions as any[] | undefined ?? [])
        .filter(instruction => instruction.type === 'TimelineAddEntries')
        .flatMap(instruction => instruction.entries as any[])
        .filter(entry => ['tweet-', 'profile-conversation-'].some(prefix => entry.entryId.startsWith(prefix)))

      const directTweets = entries
        .filter(entry => entry.content.itemContent?.itemType === 'TimelineTweet')
        .map(entry => entry.content.itemContent?.tweet_results.result as unknown as RawTweet)

      const moduleTweets = entries
        .filter(entry => entry.content.entryType === 'TimelineTimelineModule')
        .flatMap(entry => (entry.content.items || [])
          .map((item: any) => item.item.itemContent.tweet_results.result as unknown as RawTweet))

      return {
        tweets: [
          ...directTweets,
          ...moduleTweets,
        ]
          .filter((tweet): tweet is RawTweet => !!tweet)
          .sort((a, b) => b.rest_id.localeCompare(a.rest_id)),
        nextCursor: getBottomCursor(response.data),
      }
    })
  }

  /** Fetches the tweets of a list. */
  public async getListTweets(id: string): Promise<RawTweet[]> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<IListTweetsResponse>(ResourceType.LIST_TWEETS, { id })
      const instructions = (response.data.list?.tweets_timeline?.timeline?.instructions ?? []) as any[]

      return instructions
        .flatMap(instruction => instruction.entries.map((entry: any) => entry.content.itemContent?.tweet_results?.result))
        .filter((tweet: unknown): tweet is RawTweet => !!tweet)
    })
  }

  /** Fetches a Space's raw `audioSpace` node; `null` when deleted/inaccessible. */
  public async getSpace(id: string): Promise<IAudioSpace | null> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<IAudioSpaceByIdResponse>(ResourceType.SPACE_DETAILS, { id })
      return response.data?.audioSpace ?? null
    })
  }

  /** Low-level escape hatch: run a task against a pooled fetcher. */
  public run<T>(task: (fetcher: FetcherService) => Promise<T>): Promise<T> {
    return this.pool.run(task)
  }
}
