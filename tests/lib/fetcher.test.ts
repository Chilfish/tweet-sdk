import type { HttpClient, HttpResponse } from '../../src/lib/http/types'
import type { TidProvider } from '../../src/lib/types/TidProvider'
import { describe, expect, it, vi } from 'vitest'
import { ResourceType } from '../../src/lib/enums/Resource'
import { AuthError, NotSupportedError, RateLimitError } from '../../src/lib/errors'
import { encodeBase64 } from '../../src/lib/http/base64'
import { RettiwtConfig } from '../../src/lib/models/RettiwtConfig'
import { FetcherService } from '../../src/lib/services/public/FetcherService'

const COOKIE = 'auth_token=abc; ct0=csrf-token; kdt=kdt; twid=u%3D42;'
const API_KEY = encodeBase64(COOKIE)

const tidProvider: TidProvider = {
  async getHeader() {
    return { 'x-client-transaction-id': 'tid-123' }
  },
}

function response<T>(status: number, data: T): HttpResponse<T> {
  return {
    status,
    statusText: status === 200
      ? 'OK'
      : 'Error',
    headers: new Headers(),
    data,
    url: 'https://x.com/i/api/graphql/test',
  }
}

function setup(handler: (request: Parameters<HttpClient['request']>[0]) => Promise<HttpResponse>) {
  const fetch = vi.fn(handler)
  const client: HttpClient = { request: fetch as HttpClient['request'] }
  const config = new RettiwtConfig({
    apiKey: API_KEY,
    httpClient: client,
    tidProvider,
    timeout: 1234,
  })
  return {
    fetcher: new FetcherService(config),
    config,
    fetch,
  }
}

const tweetResponse = {
  data: {
    tweetResult: {
      result: {
        __typename: 'Tweet',
        rest_id: '1',
        legacy: { full_text: 'hello' },
      },
    },
  },
}

describe('fetcherService', () => {
  it('signs requests with auth, csrf, tx and default headers', async () => {
    const { fetcher, fetch } = setup(async () => response(200, tweetResponse))

    const data = await fetcher.request(ResourceType.TWEET_DETAILS, { id: '1' })

    expect(data).toEqual(tweetResponse)
    const request = fetch.mock.calls[0]![0]!
    expect(request.headers!.authorization).toMatch(/^Bearer /)
    expect(request.headers).toMatchObject({
      'cookie': 'auth_token=abc;ct0=csrf-token;kdt=kdt;twid=u%3D42;',
      'x-csrf-token': 'csrf-token',
      'x-client-transaction-id': 'tid-123',
      'Authority': 'x.com',
    })
    expect(request.timeout).toBe(1234)
    expect(String(request.params!.variables)).toContain('"tweetId":"1"')
    expect(String(request.params!.features)).toContain('"responsive_web_jetfuel_frame":true')
  })

  it('maps 429 to RateLimitError', async () => {
    const { fetcher } = setup(async () => response(429, {
      errors: [
        { code: 88, message: 'rate limited' },
      ],
    }))

    const error = await fetcher.request(ResourceType.TWEET_DETAILS, { id: '1' }).catch(err => err)

    expect(error).toBeInstanceOf(RateLimitError)
    expect((error as RateLimitError).status).toBe(429)
  })

  it('throws NotSupportedError when a resource needs a user credential', async () => {
    const fetcher = new FetcherService(new RettiwtConfig({
      httpClient: {
        request: vi.fn() as unknown as HttpClient['request'],
      },
      tidProvider,
    }))

    const error = await fetcher.request(ResourceType.TWEET_REPLIES, { id: '1' }).catch(err => err)

    expect(error).toBeInstanceOf(NotSupportedError)
    expect((error as NotSupportedError).status).toBe(403)
    expect((error as NotSupportedError).resource).toBe(ResourceType.TWEET_REPLIES)
    expect((error as Error).message).toBe('Not authorized to access requested resource')
  })

  it('maps an auth error embedded in a 200 body to AuthError', async () => {
    const { fetcher } = setup(async () => response(200, {
      errors: [
        { code: 32, message: 'Could not authenticate you' },
      ],
    }))

    const error = await fetcher.request(ResourceType.TWEET_DETAILS, { id: '1' }).catch(err => err)

    expect(error).toBeInstanceOf(AuthError)
    expect((error as AuthError).status).toBe(401)
  })

  it('retries 404 responses up to maxRetries', async () => {
    let call = 0
    const fetch = vi.fn(async () => {
      call += 1
      return call === 1
        ? response(404, {
            errors: [
              { message: 'not found' },
            ],
          })
        : response(200, tweetResponse)
    })
    const config = new RettiwtConfig({
      apiKey: API_KEY,
      httpClient: { request: fetch as HttpClient['request'] },
      tidProvider,
      maxRetries: 2,
    })
    const fetcher = new FetcherService(config)

    await expect(fetcher.request(ResourceType.TWEET_DETAILS, { id: '1' })).resolves.toEqual(tweetResponse)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('calls the response middleware', async () => {
    const middleware = vi.fn()
    const client: HttpClient = {
      request: vi.fn(async () => response(200, tweetResponse)) as HttpClient['request'],
    }
    const fetcher = new FetcherService(new RettiwtConfig({
      apiKey: API_KEY,
      httpClient: client,
      tidProvider,
      responseMiddleware: middleware,
    }))

    await fetcher.request(ResourceType.TWEET_DETAILS, { id: '1' })
    expect(middleware).toHaveBeenCalledOnce()
  })
})
