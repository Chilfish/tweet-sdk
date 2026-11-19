import { describe, expect, it } from 'vitest'
import * as api from '../src/index'

describe('public api', () => {
  it('exposes the core client surface', () => {
    expect(typeof api.TwitterClient).toBe('function')
    expect(typeof api.RettiwtPool).toBe('function')
    expect(typeof api.FetcherService).toBe('function')
    expect(typeof api.RettiwtConfig).toBe('function')
    expect(typeof api.createFetchHttpClient).toBe('function')
  })

  it('exposes the error hierarchy', () => {
    expect(new api.RateLimitError('x')).toBeInstanceOf(api.TwitterApiError)
    expect(new api.AuthError('x')).toBeInstanceOf(api.TwitterApiError)
    expect(new api.NotFoundError('x')).toBeInstanceOf(api.TwitterApiError)
    expect(new api.RateLimitError('x').status).toBe(429)
  })

  it('exposes the parse layer', () => {
    expect(typeof api.enrichTweet).toBe('function')
    expect(typeof api.getEntities).toBe('function')
    expect(typeof api.mapPollCard).toBe('function')
    expect(typeof api.mapSpaceDetails).toBe('function')
    expect(typeof api.mapArticle).toBe('function')
    expect(typeof api.organizeTweets).toBe('function')
    expect(typeof api.normalizeMediaUrl).toBe('function')
    expect(typeof api.normalizeProfileImageUrl).toBe('function')
  })

  it('keeps enums usable from the barrel', () => {
    expect(api.ResourceType.TWEET_DETAILS).toBe('TWEET_DETAILS')
    expect(api.TweetRepliesSortType.LIKES).toBeDefined()
  })
})
