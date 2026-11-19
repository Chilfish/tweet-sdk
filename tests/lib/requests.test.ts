import type { HttpRequest } from '../../src/lib/http/types'
import { describe, expect, it } from 'vitest'
import { TweetRequests } from '../../src/lib/requests/Tweet'

function fieldToggles(request: HttpRequest): Record<string, unknown> {
  return JSON.parse(String(request.params?.fieldToggles))
}

describe('tweetRequests', () => {
  it('details requests Article rich content and plain text', () => {
    const request = TweetRequests.details('1')

    expect(request.params?.variables).toEqual(expect.stringContaining('"tweetId":"1"'))
    expect(fieldToggles(request)).toMatchObject({
      withArticleRichContentState: true,
      withArticlePlainText: true,
    })
  })

  it('replies requests Article rich content with a plain-text fallback', () => {
    const request = TweetRequests.replies('1')

    expect(fieldToggles(request)).toMatchObject({
      withArticleRichContentState: true,
      withArticlePlainText: true,
    })
  })
})
