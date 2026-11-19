import type { RawTweet } from '../../src/lib/types/enriched'
import { describe, expect, it } from 'vitest'
import { enrichTweet } from '../../src/lib/parse/tweet'
import { createNodeClient } from '../../src/node'

/**
 * Integration cases against the real upstream.
 *
 * Skipped by default; run them after providing a key and sample ids:
 *
 * ```bash
 * TWEET_KEYS=<base64 cookie> TWEET_TEST_ID=<tweet-id> bun run test
 * # Optional: TWEET_TEST_SPACE_ID=<space-id> TWEET_TEST_USER=<username>
 * ```
 *
 * Assertions only cover the contract shape and never hard-code copy, so upstream
 * content changes do not cause meaningless red builds.
 */
const keys = (process.env.TWEET_KEYS ?? '').split(',').map(key => key.trim()).filter(Boolean)
const tweetId = process.env.TWEET_TEST_ID
const spaceId = process.env.TWEET_TEST_SPACE_ID
const username = process.env.TWEET_TEST_USER

const enabled = keys.length > 0 && !!tweetId

describe.skipIf(!enabled)('integration · real upstream', () => {
  const client = createNodeClient({ keys })

  it('fetches a tweet and enriches it', async () => {
    const raw = await client.getTweet(tweetId!)
    const tweet = enrichTweet(raw as RawTweet)

    expect(raw.rest_id).toBe(tweetId)
    expect(tweet).not.toBeNull()
    expect(tweet!.id).toBe(tweetId)
    expect(tweet!.user.screen_name).not.toBe('')
    expect(Array.isArray(tweet!.entities)).toBe(true)
  })

  it('fetches replies with a cursor slot', async () => {
    const result = await client.getReplies(tweetId!)

    expect(Array.isArray(result.tweets)).toBe(true)
    expect(result.nextCursor === null || typeof result.nextCursor === 'string').toBe(true)
  })

  it('searches tweets with a query', async () => {
    const result = await client.searchTweets('from:x', { count: 5 })

    expect(Array.isArray(result.tweets)).toBe(true)
    expect(result.nextCursor === null || typeof result.nextCursor === 'string').toBe(true)
  })

  it.skipIf(!username)('fetches a user profile', async () => {
    const user = await client.getUser(username!)
    expect(user?.userName?.toLowerCase()).toBe(username!.toLowerCase())
  })

  it.skipIf(!spaceId)('fetches space metadata', async () => {
    const space = await client.getSpace(spaceId!)
    expect(space === null || typeof space === 'object').toBe(true)
  })
})
