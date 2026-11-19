import { createServer } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { createBunProxyHttpClient, createProxyHttpClient } from '../../src/lib/http/proxy'

const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined'

describe('createProxyHttpClient', () => {
  it('rejects unsupported proxy schemes', () => {
    expect(() => createBunProxyHttpClient('socks5://127.0.0.1:7890')).toThrow('Unsupported proxy scheme')
  })

  it.skipIf(isBun)('points Node users at the node adapter', () => {
    expect(() => createProxyHttpClient('http://127.0.0.1:7890')).toThrow('@chilfish/tweet/node')
  })

  it('passes the proxy through the Bun native fetch option', async () => {
    const globalWithBun = globalThis as unknown as { Bun?: unknown }
    const originalBun = globalWithBun.Bun
    const originalFetch = globalThis.fetch
    const fetchMock = vi.fn(async () => new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    globalWithBun.Bun = {}
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const client = createProxyHttpClient('http://127.0.0.1:7890')
      await client.request({ url: 'https://example.com' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ proxy: 'http://127.0.0.1:7890' }),
      )
    }
    finally {
      globalThis.fetch = originalFetch
      if (originalBun === undefined)
        delete globalWithBun.Bun
      else
        globalWithBun.Bun = originalBun
    }
  })

  it.skipIf(!isBun)('bun createProxyFetch routes through a dead proxy instead of going direct', async () => {
    const { createProxyFetch } = await import('../../src/node')
    const server = createServer((_request, response) => {
      response.end('ok')
    })

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    const port = typeof address === 'object' && address
      ? address.port
      : 0

    try {
      const client = createProxyFetch('http://127.0.0.1:1')
      await expect(client.request({
        url: `http://127.0.0.1:${port}`,
        timeout: 3000,
      })).rejects.toBeTruthy()
    }
    finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })
})
