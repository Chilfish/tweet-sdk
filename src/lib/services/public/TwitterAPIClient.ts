import type { RettiwtPool } from '../../pool'
import type { ITweetFilter } from '../../types/args/FetchArgs'
import type { EnrichedUser, RawTweet } from '../../types/enriched'
import type { IListTweetsResponse } from '../../types/raw/list/Tweets'
import type { IAudioSpace, IAudioSpaceByIdResponse } from '../../types/raw/space/Details'
import type { ITweetDetailsResponse } from '../../types/raw/tweet/Details'
import type { ITweetRepliesResponse } from '../../types/raw/tweet/Replies'
import type { ITweetSearchResponse } from '../../types/raw/tweet/Search'
import type { IUserDetailsResponse } from '../../types/raw/user/Details'
import type { IUserTweetsResponse } from '../../types/raw/user/Tweets'
import { Extractors } from '../../collections/Extractors'
import { BaseType } from '../../enums/Data'
import { ResourceType } from '../../enums/Resource'
import { TweetRepliesSortType } from '../../enums/Tweet'
import { CursoredData } from '../../models/data/CursoredData'

export interface CursoredTweets {
  tweets: RawTweet[]
  cursor: string
}

/**
 * Low-level Twitter API client.
 * Responsibility: wrap every raw request to the Twitter API and return unprocessed raw data.
 */
export class TwitterAPIClient {
  public onFetchedresponse: (key: string, data: any) => Promise<void> = async () => {}

  constructor(private readonly pool: RettiwtPool) {}

  /**
   * Fetch the raw data of a single tweet.
   * @throws {Error} Thrown when the API request fails
   */
  async fetchTweetRaw(id: string): Promise<RawTweet> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<ITweetDetailsResponse>(
        ResourceType.TWEET_DETAILS,
        { id },
      )
      return response.data.tweetResult.result
    })
  }

  /**
   * Fetch the raw details of a Space (audio livestream / recording replay).
   *
   * The `card` of a Space tweet is a shell (the bindings only carry tweet_id / id / card_url,
   * no title and no image); the title, host, listener count and duration all live in
   * `audioSpace.metadata` of `AudioSpaceById`, so the card data has to be backed by one more
   * call to this endpoint. Returns null when it cannot be found (deleted / no permission).
   */
  async fetchSpaceDetails(id: string): Promise<IAudioSpace | null> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<IAudioSpaceByIdResponse>(
        ResourceType.SPACE_DETAILS,
        { id },
      )

      return response.data?.audioSpace ?? null
    })
  }

  /**
   * Fetch the raw data of the tweets in a list.
   */
  async fetchListTweetsRaw(id: string): Promise<RawTweet[]> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<IListTweetsResponse>(
        ResourceType.LIST_TWEETS,
        { id },
      )

      const instructions = response.data.list?.tweets_timeline?.timeline?.instructions || []
      return instructions
        .flatMap(instruction =>
          instruction.entries.map(entry =>
            entry.content.itemContent?.tweet_results?.result as unknown as RawTweet,
          ),
        )
        .filter((tweet): tweet is RawTweet => tweet !== null && tweet !== undefined)
    })
  }

  /**
   * Fetch user details.
   * @param id - User ID or username
   */
  async fetchUserDetailsRaw(id: string): Promise<EnrichedUser | null> {
    if (!id) {
      return null
    }

    return this.pool.run(async (fetcher) => {
      const resource = Number.isNaN(Number(id))
        ? ResourceType.USER_DETAILS_BY_USERNAME
        : ResourceType.USER_DETAILS_BY_ID

      const response = await fetcher.request<IUserDetailsResponse>(resource, { id })

      await this.onFetchedresponse(`${ResourceType.USER_DETAILS_BY_ID}-${id}`, response)
      const data = Extractors[resource](response) as unknown as EnrichedUser

      if (data?.profileImage) {
        data.profileImage = data.profileImage.replace('_normal', '')
      }
      return data || null
    })
  }

  /**
   * Fetch the raw user timeline data.
   */
  async fetchUserTimelineRaw(userId: string, cursor?: string): Promise<CursoredTweets> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<IUserTweetsResponse>(
        ResourceType.USER_TIMELINE,
        { id: userId, cursor },
      )
      const cursoredData = new CursoredData(response, BaseType.TWEET)
      await this.onFetchedresponse(`${ResourceType.USER_TIMELINE}-${userId}`, {
        response,
        cursor: cursoredData.next,
      })
      const tweets = this.extractTimelineTweets(response)
      return {
        tweets,
        cursor: cursoredData.next,
      }
    })
  }

  /**
   * Fetch the raw user timeline data, including replies.
   */
  async fetchUserTimelineWithRepliesRaw(userId: string, cursor?: string): Promise<CursoredTweets> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<IUserTweetsResponse>(
        ResourceType.USER_TIMELINE_AND_REPLIES,
        {
          id: userId,
          cursor,
        },
      )
      const cursoredData = new CursoredData(response, BaseType.TWEET)
      await this.onFetchedresponse(`${ResourceType.USER_TIMELINE_AND_REPLIES}-${userId}`, {
        response,
        cursor: cursoredData.next,
      })
      const tweets = this.extractTimelineTweets(response)

      return {
        tweets,
        cursor: cursoredData.next,
      }
    })
  }

  /**
   * Fetch the raw data of the replies to a tweet.
   */
  async fetchRepliesRaw(tweetId: string): Promise<RawTweet[]> {
    return this.pool.run(async (fetcher) => {
      const response = await fetcher.request<ITweetRepliesResponse>(
        ResourceType.TWEET_REPLIES,
        {
          id: tweetId,
          sortBy: TweetRepliesSortType.LIKES,
        },
      )

      const instructions = response.data
        .threaded_conversation_with_injections_v2
        .instructions
        .filter(t => t.type === 'TimelineAddEntries')

      const mainTweet = this.extractMainTweet(instructions)
      const comments = this.extractComments(instructions)

      return [...comments, mainTweet]
    })
  }

  /**
   * Search tweets.
   */
  public async searchTweetsRaw(filter: ITweetFilter, cursor?: string, count?: number): Promise<CursoredTweets> {
    return this.pool.run(async (fetcher) => {
      const resource = ResourceType.TWEET_SEARCH

      // Fetching raw list of filtered tweets
      const response = await fetcher.request<ITweetSearchResponse>(resource, {
        filter,
        count,
        cursor,
      })

      const cursoredData = new CursoredData(response, BaseType.TWEET)
      await this.onFetchedresponse(`${resource}-${filter.fromUsers?.[0]}`, {
        response,
        cursor: cursoredData.next,
      })

      const instructions = response.data
        .search_by_raw_query
        ?.search_timeline
        ?.timeline
        ?.instructions
        ?.filter(t => t.type === 'TimelineAddEntries') || []

      const tweets = this.extractSearchTweets(instructions)

      return {
        tweets,
        cursor: cursoredData.next,
      }
    })
  }

  /**
   * Extract the tweet list from a timeline response.
   * @private
   */
  private extractTimelineTweets(response: IUserTweetsResponse): RawTweet[] {
    const rawTweets = response.data.user.result.timeline?.timeline
      ?.instructions
      .filter(d => d.type === 'TimelineAddEntries')
      .flatMap(d => d.entries)
      .filter(entry =>
        ['tweet-', 'profile-conversation-'].some(prefix =>
          entry.entryId.startsWith(prefix),
        ),
      ) ?? []

    const directTweets = rawTweets
      .filter(e => e.content.itemContent?.itemType === 'TimelineTweet')
      .map(e => e.content.itemContent?.tweet_results.result as unknown as RawTweet)
      .filter((tweet): tweet is RawTweet => tweet !== null && tweet !== undefined)

    const moduleTweets = rawTweets
      .filter(d => d.content.entryType === 'TimelineTimelineModule')
      .flatMap(d =>
        (d.content.items?.map(({ item }) =>
          item.itemContent.tweet_results.result as unknown as RawTweet,
        ) ?? []),
      )
      .filter((tweet): tweet is RawTweet => tweet !== null && tweet !== undefined)

    return [
      ...directTweets,
      ...moduleTweets,
    ]
      .filter(Boolean)
      .sort((a, b) => b.rest_id?.localeCompare(a.rest_id))
  }

  /**
   * Extract the main tweet.
   * @private
   */

  private extractMainTweet(instructions: any[]): RawTweet {
    const mainTweet = instructions
      .flatMap(d => d.entries?.filter((e: any) => e.content.entryType === 'TimelineTimelineItem') || [])
      .flatMap((entry: any) => entry.content.itemContent?.tweet_results.result)
      .filter((result: any) => result !== null && result !== undefined)
      .at(0)

    return (mainTweet || {}) as RawTweet
  }

  /**
   * Extract the list of comments.
   * @private
   */
  private extractComments(instructions: any[]): RawTweet[] {
    return instructions
      .flatMap(t => t.entries?.filter((d: any) => d.content.entryType === 'TimelineTimelineModule') || [])
      .flatMap((entry: any) =>
        (entry.content.items || []).map((d: any) => d.item.itemContent.tweet_results.result),
      )
      .filter((result: any): result is RawTweet => result !== null && result !== undefined)
  }

  /**
   * Extract the tweets from search results.
   * @private
   */
  private extractSearchTweets(instructions: any[]): RawTweet[] {
    return instructions
      .flatMap((t: any) => t.entries?.filter((d: any) => d.content.entryType === 'TimelineTimelineItem') || [])
      .flatMap((entry: any) => entry.content.itemContent?.tweet_results.result)
      .filter(result => !!result) as unknown as RawTweet[]
  }
}
