import { enrichTweet, normalizeMediaUrl } from '../src/index'

/**
 * Runnable example.
 *
 * Without arguments it runs a local parse demo (no network, CI-safe):
 *   bun run example
 *
 * With a tweet id it fetches the real tweet (needs `TWEET_KEYS`):
 *   TWEET_KEYS=<base64 cookie> bun examples/basic.ts <tweet-id>
 */
const DEMO_TWEET = {
  __typename: 'Tweet',
  rest_id: '1900000000000000001',
  core: {
    user_results: {
      result: {
        rest_id: '42',
        is_blue_verified: false,
        profile_image_shape: 'Circle',
        legacy: {
          name: 'Demo User',
          screen_name: 'demo',
          verified: false,
          profile_image_url_https: 'https://pbs.twimg.com/profile_images/1/avatar_normal.jpg',
        },
        core: { name: 'Demo User', screen_name: 'demo' },
        avatar: { image_url: 'https://pbs.twimg.com/profile_images/1/avatar.jpg' },
      },
    },
  },
  legacy: {
    id_str: '1900000000000000001',
    full_text: 'hello #world https://t.co/abc',
    lang: 'en',
    created_at: 'Mon Jan 01 00:00:00 +0000 2024',
    reply_count: 0,
    favorite_count: 0,
    quote_count: 0,
    retweet_count: 0,
    entities: {
      hashtags: [
        {
          indices: [6, 12],
          text: 'world',
        },
      ],
      user_mentions: [],
      urls: [
        {
          indices: [13, 30],
          url: 'https://t.co/abc',
          expanded_url: 'https://example.com',
          display_url: 'example.com',
        },
      ],
      symbols: [],
      media: [],
    },
  },
  views: { count: '0' },
}

async function demo(): Promise<void> {
  const tweet = enrichTweet(DEMO_TWEET as never)

  console.log(`@${tweet?.user.screen_name}: ${tweet?.text}`)
  console.log('entities:', tweet?.entities.map(entity => entity.type).join(', '))
  console.log(
    'media url:',
    normalizeMediaUrl('https://pbs.twimg.com/media/HPxZhM0aQAAZxz3?format=jpg&name=small'),
  )
}

async function fetchAndPrint(tweetId: string): Promise<void> {
  const { createNodeClient } = await import('../src/node')
  const client = createNodeClient()
  const tweet = enrichTweet(await client.getTweet(tweetId))

  if (!tweet) {
    console.log('tweet not available (tombstone or unparseable)')
    return
  }

  console.log(`@${tweet.user.screen_name}: ${tweet.text}`)
  if (tweet.mediaDetails?.length)
    console.log(tweet.mediaDetails.map(media => normalizeMediaUrl(media.media_url_https)).join('\n'))
}

const tweetId = process.argv[2]

if (tweetId) {
  fetchAndPrint(tweetId).catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
else {
  demo().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
