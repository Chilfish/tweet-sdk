import type { RawTweet } from '../../src/lib/types/enriched'
import { describe, expect, it, vi } from 'vitest'
import { enrichTweet } from '../../src/lib/parse/tweet'

function rawTweet(overrides: Record<string, unknown> = {}): RawTweet {
  return {
    __typename: 'Tweet',
    rest_id: '1900000000000000001',
    core: {
      user_results: {
        result: {
          rest_id: '42',
          is_blue_verified: true,
          profile_image_shape: 'Circle',
          legacy: {
            name: 'Test User',
            screen_name: 'tester',
            verified: false,
            profile_image_url_https: 'https://pbs.twimg.com/profile_images/1/avatar_normal.jpg',
          },
          core: { name: 'Test User', screen_name: 'tester' },
          avatar: { image_url: 'https://pbs.twimg.com/profile_images/1/avatar.jpg' },
        },
      },
    },
    legacy: {
      id_str: '1900000000000000001',
      full_text: 'hello @friend and #tag',
      lang: 'en',
      created_at: 'Mon Jan 01 00:00:00 +0000 2024',
      conversation_id_str: '1900000000000000001',
      in_reply_to_status_id_str: '1900000000000000000',
      reply_count: 1,
      favorite_count: 2,
      quote_count: 3,
      retweet_count: 4,
      entities: {
        hashtags: [
          {
            indices: [17, 21],
            text: 'tag',
          },
        ],
        user_mentions: [
          {
            indices: [6, 13],
            screen_name: 'friend',
            name: 'Friend',
            id_str: '7',
          },
        ],
        urls: [],
        symbols: [],
        media: [],
      },
    },
    views: { count: '5' },
    ...overrides,
  } as unknown as RawTweet
}

describe('enrichTweet', () => {
  it('returns null for tombstones', () => {
    expect(enrichTweet({ __typename: 'TweetTombstone' } as unknown as RawTweet)).toBeNull()
    expect(enrichTweet(undefined as unknown as RawTweet)).toBeNull()
  })

  it('maps ids, user and counters', () => {
    const tweet = enrichTweet(rawTweet())!

    expect(tweet.id).toBe('1900000000000000001')
    expect(tweet.url).toBe('https://twitter.com/tester/status/1900000000000000001')
    expect(tweet.user).toMatchObject({ id: '42', screen_name: 'tester', is_blue_verified: true })
    expect(tweet.in_reply_to_status_id_str).toBe('1900000000000000000')
    expect(tweet.isInlineMedia).toBe(false)
  })

  it('normalizes the profile image and strips the size suffix', () => {
    const tweet = enrichTweet(rawTweet())!
    expect(tweet.user.profile_image_url_https).not.toContain('_normal')
  })

  it('splices entities into the display text', () => {
    const tweet = enrichTweet(rawTweet())!
    const texts = tweet.entities.map(entity => entity.text).join('')

    expect(texts).toBe('hello @friend and #tag')
    expect(tweet.entities.find(entity => entity.type === 'mention')).toMatchObject({
      href: 'https://twitter.com/friend',
    })
    expect(tweet.entities.find(entity => entity.type === 'hashtag')).toMatchObject({
      href: 'https://twitter.com/hashtag/tag',
    })
  })

  it('unwraps retweets and records the event id', () => {
    const original = rawTweet()
    const retweet = rawTweet({
      legacy: {
        id_str: '1900000000000000009',
        retweeted_status_result: { result: original },
      },
    })

    const tweet = enrichTweet(retweet)!
    expect(tweet.id).toBe('1900000000000000001')
    expect(tweet.retweetedOriginalId).toBe('1900000000000000009')
  })

  it('forwards jetfuel parse failures to the injected logger', () => {
    const logger = {
      warn: vi.fn(),
    }
    const withJetfuel = rawTweet({
      card: {
        legacy: {
          name: 'unified_card',
          binding_values: [
            {
              key: 'unified_card',
              value: { string_value: '{}' },
            },
          ],
        },
      },
      jetfuel_attachment: { height: 1, payload: 'AAAA' },
    })

    enrichTweet(withJetfuel, undefined, logger)

    expect(logger.warn).toHaveBeenCalledWith('jetfuel.parse.fallback', expect.objectContaining({
      reason: 'payload did not yield url/image/title',
    }))
  })
})
