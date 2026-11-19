import type { EnrichedTweet, RawTweet } from '../../types/enriched'
import { enrichTweet } from '../../parse/tweet'

/**
 * Tweet enrichment service.
 * Responsibility: turn raw tweet data into enriched tweets and handle
 * business logic such as quoted tweets.
 */
export class TweetEnrichmentService {
  /**
   * Enrich a single raw tweet.
   * @returns The enriched tweet, or null when enrichment fails
   */
  enrichSingleTweet(rawTweet: RawTweet): EnrichedTweet | null {
    const enrichedTweet = enrichTweet(rawTweet)
    if (!enrichedTweet) {
      return null
    }

    // Handle the quoted tweet
    if (rawTweet.quoted_status_result?.result) {
      const quotedTweet = enrichTweet(rawTweet.quoted_status_result.result)
      if (quotedTweet) {
        enrichedTweet.quotedTweet = quotedTweet
      }
    }

    return enrichedTweet
  }

  /**
   * Batch-enrich raw tweets.
   */
  enrichTweets(rawTweets: RawTweet[]): EnrichedTweet[] {
    return rawTweets
      .map(tweet => this.enrichSingleTweet(tweet))
      .filter((tweet): tweet is EnrichedTweet => tweet !== null)
  }

  /**
   * Enrich user timeline tweets and filter out advertisements.
   * @param rawTweets - List of raw tweets
   * @param userId - User ID, used to filter out advertisements not posted by that user
   */
  enrichUserTimelineTweets(rawTweets: RawTweet[], userId: string): EnrichedTweet[] {
    return this.enrichTweets(rawTweets)
      .filter(tweet => !this.isAdvertisement(tweet, userId))
  }

  /**
   * Determine whether a tweet is an advertisement.
   * @private
   */
  private isAdvertisement(tweet: EnrichedTweet, userId: string): boolean {
    return tweet.user.id !== userId && !tweet.retweetedOriginalId
  }
}
