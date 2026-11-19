import type { FetcherService } from '../../src/lib/services/public/FetcherService'
import { describe, expect, it, vi } from 'vitest'
import { parseSearchTimeline, TwitterClient } from '../../src/lib/client'
import { ResourceType } from '../../src/lib/enums/Resource'

function fakeClient(request: (resource: ResourceType, args: unknown) => unknown) {
  const fetcher = {
    request: vi.fn(request),
  } as unknown as FetcherService
  return new TwitterClient([], {
    createFetcher: () => fetcher,
  })
}

const searchResponse = {
  data: {
    search_by_raw_query: {
      search_timeline: {
        timeline: {
          instructions: [
            {
              entries: [
                {
                  entryId: 'tweet-1',
                  content: {
                    itemContent: {
                      tweet_results: {
                        result: { rest_id: '1', legacy: {} },
                      },
                    },
                  },
                },
                {
                  entryId: 'cursor-bottom',
                  content: {
                    entryType: 'TimelineTimelineCursor',
                    itemContent: {
                      tweet_results: {
                        result: { rest_id: '2' },
                      },
                    },
                  },
                },
                {
                  entryId: 'tweet-3',
                  content: {
                    itemContent: {
                      tweet_results: {
                        result: {
                          __typename: 'TweetWithVisibilityResults',
                          tweet: { rest_id: '3', legacy: {} },
                        },
                      },
                    },
                  },
                },
                {
                  entryId: 'cursor-bottom-1',
                  content: { cursorType: 'Bottom', value: 'next-cursor' },
                },
              ],
            },
          ],
        },
      },
    },
  },
}

describe('parseSearchTimeline', () => {
  it('keeps tweet entries, unwraps visibility results and reads the bottom cursor', () => {
    const result = parseSearchTimeline(searchResponse as never)

    expect(result.tweets.map(tweet => tweet.rest_id)).toEqual(['1', '3'])
    expect(result.nextCursor).toBe('next-cursor')
  })

  it('tolerates an empty payload', () => {
    expect(parseSearchTimeline({ data: {} } as never)).toEqual({ tweets: [], nextCursor: null })
  })
})

describe('twitterClient', () => {
  it('returns the raw tweet result', async () => {
    const client = fakeClient(async () => ({
      data: {
        tweetResult: {
          result: { rest_id: '1' },
        },
      },
    }))

    await expect(client.getTweet('1')).resolves.toEqual({ rest_id: '1' })
  })

  it('splits replies into comments plus the main tweet', async () => {
    const client = fakeClient(async () => ({
      data: {
        threaded_conversation_with_injections_v2: {
          instructions: [
            {
              type: 'TimelineAddEntries',
              entries: [
                {
                  content: {
                    entryType: 'TimelineTimelineItem',
                    itemContent: {
                      tweet_results: {
                        result: { rest_id: 'main' },
                      },
                    },
                  },
                },
                {
                  content: {
                    entryType: 'TimelineTimelineModule',
                    items: [
                      {
                        item: {
                          itemContent: {
                            tweet_results: {
                              result: { rest_id: 'reply' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    }))

    const result = await client.getReplies('main')
    expect(result.tweets.map(tweet => tweet.rest_id)).toEqual(['reply', 'main'])
    expect(result.nextCursor).toBeNull()
  })

  it('passes search filters through the request layer', async () => {
    const request = vi.fn(async () => ({ data: searchResponse.data }))
    const client = new TwitterClient([], {
      createFetcher: () => ({ request } as unknown as FetcherService),
    })

    const result = await client.searchTweets('#tag', { type: 'top', count: 5, cursor: 'c' })

    expect(request).toHaveBeenCalledWith(ResourceType.TWEET_SEARCH, {
      filter: {
        includeWords: ['#tag'],
        top: true,
      },
      count: 5,
      cursor: 'c',
    })
    expect(result.tweets).toHaveLength(2)
  })

  it('returns null for a missing space node', async () => {
    const client = fakeClient(async () => ({ data: {} }))
    await expect(client.getSpace('missing')).resolves.toBeNull()
  })

  it('returns null for an unknown user', async () => {
    const client = fakeClient(async () => ({ data: {} }))
    await expect(client.getUser('nobody')).resolves.toBeNull()
  })
})
