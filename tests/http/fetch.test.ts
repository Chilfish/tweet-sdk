import { describe, expect, it, vi } from 'vitest'
import { createFetchHttpClient, encodeQueryParams } from '../../src/lib/http'

function mockFetch(body: unknown, init: ResponseInit = {}) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(typeof body === 'string'
      ? body
      : JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
      ...init,
    }))
}

describe('encodeQueryParams', () => {
  it('encodes with encodeURIComponent semantics and drops empty values', () => {
    expect(encodeQueryParams({
      variables: '{"a":"b c"}',
      count: 10,
      flag: true,
      missing: undefined,
      none: null,
    })).toBe('variables=%7B%22a%22%3A%22b%20c%22%7D&count=10&flag=true')
  })

  it('returns an empty string for no params', () => {
    expect(encodeQueryParams()).toBe('')
    expect(encodeQueryParams({})).toBe('')
  })
})

describe('createFetchHttpClient', () => {
  it('appends encoded query params to the url', async () => {
    const fetch = mockFetch({ data: 1 })
    const client = createFetchHttpClient({ fetch: fetch as unknown as typeof globalThis.fetch })

    const response = await client.request({
      url: 'https://x.com/i/api/graphql/abc/TweetResultByRestId',
      params: { variables: '{"tweetId":"1"}' },
    })

    expect(response.data).toEqual({ data: 1 })
    expect(fetch.mock.calls[0]![0]).toBe(
      'https://x.com/i/api/graphql/abc/TweetResultByRestId?variables=%7B%22tweetId%22%3A%221%22%7D',
    )
  })

  it('serializes plain objects as JSON and strings as form data', async () => {
    const fetch = mockFetch({ ok: true })
    const client = createFetchHttpClient({ fetch: fetch as unknown as typeof globalThis.fetch })

    await client.request({
      url: 'https://x.com/graphql',
      method: 'post',
      data: { a: 1 },
    })
    await client.request({ url: 'https://x.com/form', method: 'post', data: 'a=1&b=2' })

    const jsonInit = fetch.mock.calls[0]![1]!
    expect((jsonInit.headers as Headers).get('content-type')).toBe('application/json')
    expect(jsonInit.body).toBe('{"a":1}')

    const formInit = fetch.mock.calls[1]![1]!
    expect((formInit.headers as Headers).get('content-type')).toBe('application/x-www-form-urlencoded')
    expect(formInit.body).toBe('a=1&b=2')
  })

  it('keeps non-json and empty bodies as text', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    const client = createFetchHttpClient({ fetch: fetch as unknown as typeof globalThis.fetch })

    const response = await client.request({ url: 'https://x.com/empty' })
    expect(response.status).toBe(204)
    expect(response.data).toBeUndefined()
  })

  it('passes through non-2xx responses instead of throwing', async () => {
    const fetch = vi.fn(async () => new Response('{"errors":[{"code":32}]}', {
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'content-type': 'application/json' },
    }))
    const client = createFetchHttpClient({ fetch: fetch as unknown as typeof globalThis.fetch })

    const response = await client.request({ url: 'https://x.com/private' })
    expect(response.status).toBe(401)
    expect(response.data).toEqual({
      errors: [
        { code: 32 },
      ],
    })
  })
})
