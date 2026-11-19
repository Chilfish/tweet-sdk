/**
 * Runtime smoke shared by the Bun and Workers jobs.
 *
 * Imports the built package (not `src/`) and exercises the mock-HTTP path, so
 * a regression in the emitted bundle or a platform-only API is caught without
 * touching the network.
 */
import {
  attachSpaceDetails,
  enrichTweet,
  NotSupportedError,
  PoolExhaustedError,
  RettiwtPool,
  TwitterAPIClient,
} from '../dist/index.js'

function assert(condition, message) {
  if (!condition)
    throw new Error(`assertion failed: ${message}`)
}

function rawTweet(overrides = {}) {
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
      full_text: 'hello smoke',
      lang: 'en',
      created_at: 'Mon Jan 01 00:00:00 +0000 2024',
      conversation_id_str: '1900000000000000001',
      in_reply_to_status_id_str: '1900000000000000000',
      reply_count: 2,
      favorite_count: 3,
      retweet_count: 4,
      quote_count: 5,
      entities: {
        hashtags: [],
        user_mentions: [],
        urls: [],
        symbols: [],
        media: [],
      },
    },
    views: { count: '6' },
    ...overrides,
  }
}

const userResponse = {
  data: {
    user: {
      result: {
        __typename: 'User',
        rest_id: '42',
        is_blue_verified: true,
        avatar: { image_url: 'https://pbs.twimg.com/profile_images/1/avatar_normal.jpg' },
        core: { created_at: 'Mon Jan 01 00:00:00 +0000 2024', name: 'Test User', screen_name: 'tester' },
        legacy: {
          description: '',
          created_at: 'Mon Jan 01 00:00:00 +0000 2024',
          name: 'Test User',
          screen_name: 'tester',
          following: false,
          followed_by: false,
          favourites_count: 0,
          followers_count: 0,
          friends_count: 0,
          statuses_count: 0,
          location: '',
          pinned_tweet_ids_str: [],
          profile_banner_url: '',
          profile_image_url_https: 'https://pbs.twimg.com/profile_images/1/avatar_normal.jpg',
        },
      },
    },
  },
}

export async function runSmoke() {
  assert(typeof NotSupportedError === 'function', 'NotSupportedError export')
  assert(typeof PoolExhaustedError === 'function', 'PoolExhaustedError export')
  assert(typeof TwitterAPIClient === 'function', 'TwitterAPIClient runtime export')

  const enriched = enrichTweet(rawTweet())
  assert(enriched, 'enrichTweet returns a tweet')
  assert(enriched.parent_id === '1900000000000000000', 'parent_id is populated')
  assert(enriched.replyCount === 2, 'replyCount is populated')
  assert(enriched.likeCount === 3, 'likeCount is populated')
  assert(enriched.retweetCount === 4, 'retweetCount is populated')
  assert(enriched.viewCount === 6, 'viewCount is populated')

  const fetcher = {
    async request(resource) {
      return resource === 'USER_DETAILS_BY_USERNAME'
        ? userResponse
        : {
            data: {
              tweetResult: {
                result: rawTweet(),
              },
            },
          }
    },
  }
  const pool = new RettiwtPool([], {
    createFetcher: () => fetcher,
  })
  const api = new TwitterAPIClient(pool)

  const tweet = await api.fetchTweetRaw('1900000000000000001')
  assert(tweet.rest_id === '1900000000000000001', 'TwitterAPIClient.fetchTweetRaw')

  const user = await api.fetchUserDetailsRaw('tester')
  assert(user?.profileImage === 'https://pbs.twimg.com/profile_images/1/avatar.jpg', 'avatar is normalized')

  const spaceRaw = rawTweet({
    card: {
      name: '3691233323:audiospace',
      binding_values: [
        {
          key: 'id',
          value: { string_value: 'space-1' },
        },
      ],
    },
  })
  const spaceEnriched = enrichTweet(spaceRaw)
  await attachSpaceDetails([spaceEnriched], [spaceRaw], async () => ({
    metadata: {
      title: 'Smoke Space',
      state: 'Running',
      created_at: 1700000000,
      total_live_listeners: 3,
      is_space_available_for_replay: false,
      creator_results: {
        result: {
          rest_id: '42',
          legacy: { name: 'Test User', screen_name: 'tester' },
        },
      },
    },
  }))
  assert(spaceEnriched.space?.id === 'space-1', 'attachSpaceDetails attaches metadata')
  assert(spaceEnriched.space?.availability === 'live', 'space availability is derived')
}
