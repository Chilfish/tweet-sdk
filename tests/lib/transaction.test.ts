import type { HttpClient } from '../../src/lib/http/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultTidProvider, resetTransactionCache } from '../../src/lib/transaction'

vi.mock('x-client-transaction-id', () => ({
  ClientTransaction: {
    create: async () => ({
      generateTransactionId: async (method: string, path: string) => `tid:${method}:${path}`,
    }),
  },
}))

const USABLE_SHELL = `<!DOCTYPE html><html><head>
<meta name="twitter-site-verification" content="abc" />
<script>window.__chunks={"5":"ondemand.s"}</script>
</head><body></body></html>`

function shellClient() {
  return vi.fn(async (_request: unknown) => ({
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    data: USABLE_SHELL,
    url: 'https://x.com/home',
  }))
}

function context(client: HttpClient, cookie?: string) {
  return {
    method: 'get',
    url: 'https://x.com/i/api/graphql/abc/TweetResultByRestId?variables=%7B%7D',
    cookie,
    headers: { 'user-agent': 'test' },
    client,
  }
}

afterEach(() => {
  resetTransactionCache()
})

describe('defaultTidProvider', () => {
  it('derives the transaction id from the shell path', async () => {
    const fetch = shellClient()
    const header = await defaultTidProvider.getHeader(context({ request: fetch as HttpClient['request'] }))

    expect(header).toEqual({ 'x-client-transaction-id': 'tid:GET:/i/api/graphql/abc/TweetResultByRestId' })
  })

  it('fetches the shell once and reuses the transaction', async () => {
    const fetch = shellClient()
    const client = { request: fetch as HttpClient['request'] }

    await defaultTidProvider.getHeader(context(client))
    await defaultTidProvider.getHeader(context(client))
    await defaultTidProvider.getHeader(context(client))

    expect(fetch).toHaveBeenCalledOnce()
  })

  it('de-duplicates concurrent initializations', async () => {
    const fetch = shellClient()
    const client = { request: fetch as HttpClient['request'] }

    await Promise.all([
      defaultTidProvider.getHeader(context(client)),
      defaultTidProvider.getHeader(context(client)),
    ])

    expect(fetch).toHaveBeenCalledOnce()
  })

  it('attaches the session cookie to the shell request', async () => {
    const fetch = shellClient()
    await defaultTidProvider.getHeader(context({ request: fetch as HttpClient['request'] }, 'ct0=csrf'))

    const request = fetch.mock.calls[0]![0] as { headers?: Record<string, string> }
    expect(request.headers).toMatchObject({ 'cookie': 'ct0=csrf', 'user-agent': 'test' })
  })

  it('keeps guest and authenticated caches separate', async () => {
    const fetch = shellClient()
    const client = { request: fetch as HttpClient['request'] }

    await defaultTidProvider.getHeader(context(client))
    await defaultTidProvider.getHeader(context(client, 'ct0=csrf'))

    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
