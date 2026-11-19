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
  FetcherService,
  NotSupportedError,
  PoolExhaustedError,
  ResourceType,
  RettiwtConfig,
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

const X_SHELL_HTML = `<!doctype html><html><head>
<meta name="twitter-site-verification" content="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA">
</head><body>
${[0, 1, 2, 3].map(index => `<div id="loading-x-anim-${index}"><div><div></div><div d="M 0 0 C 10 20 30 40 50 60 70 80 90 100 110 120 C 1 2 3 4 5 6 7 8 9 10 11 12 C 1 2 3 4 5 6 7 8 9 10 11 12"></div></div></div>`).join('')}
<script>1:"ondemand.s";/* })[e]||e)+"."+({1:"abcd1234" */</script>
</body></html>`

const ONDEMAND_SOURCE = '(a[0],16) (b[1],16) (c[2],16) (d[3],16)'

function mockResponse(data, url) {
  return {
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    data,
    url,
  }
}

/**
 * Exercises the default transaction-id path (legacy shell -> linkedom ->
 * x-client-transaction-id) through a real `FetcherService`.
 *
 * `ClientTransaction.create` calls the global `fetch` for the `ondemand.s`
 * chunk, so that one URL is intercepted locally; everything else goes through
 * the injected mock `HttpClient`.
 */
export async function runDefaultTidSmoke() {
  const requests = []
  const mockClient = {
    async request(request) {
      requests.push(request)
      const url = String(request.url)

      if (url.includes('guest/activate'))
        return mockResponse({ guest_token: 'guest-token' }, url)
      if (url.includes('TweetResultByRestId')) {
        return mockResponse({
          data: {
            tweetResult: {
              result: {
                __typename: 'Tweet',
                rest_id: '1',
                legacy: { full_text: 'default tid smoke' },
              },
            },
          },
        }, url)
      }
      if (url.startsWith('https://x.com/'))
        return mockResponse(X_SHELL_HTML, url)

      throw new Error(`unexpected request in default-tid smoke: ${url}`)
    },
  }

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url
    if (url.startsWith('https://abs.twimg.com/responsive-web/client-web/ondemand.s.')) {
      return new Response(ONDEMAND_SOURCE, {
        status: 200,
        headers: { 'content-type': 'application/javascript' },
      })
    }
    return originalFetch(input, init)
  }

  try {
    const fetcher = new FetcherService(new RettiwtConfig({
      httpClient: mockClient,
      timeout: 5000,
    }))

    const data = await fetcher.request(ResourceType.TWEET_DETAILS, { id: '1' })
    assert(data.data.tweetResult.result.rest_id === '1', 'default FetcherService.request')

    const shellRequest = requests.find(request => String(request.url) === 'https://x.com/home')
    assert(shellRequest, 'default transaction provider fetched the X shell')

    const apiRequest = requests.find(request => String(request.url).includes('TweetResultByRestId'))
    assert(apiRequest?.headers?.['x-client-transaction-id'], 'default transaction provider generated the header')
  }
  finally {
    globalThis.fetch = originalFetch
  }
}
