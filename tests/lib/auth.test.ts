import type { HttpClient, HttpResponse } from '../../src/lib/http/types'
import { describe, expect, it, vi } from 'vitest'
import { decodeBase64, encodeBase64 } from '../../src/lib/http/base64'
import { RettiwtConfig } from '../../src/lib/models/RettiwtConfig'
import { AuthService } from '../../src/lib/services/internal/AuthService'

const COOKIE = 'auth_token=abc; ct0=csrf; kdt=kdt; twid=u%3D42;'
const API_KEY = encodeBase64(COOKIE)

function jsonResponse<T>(data: T, headers: Record<string, string> = {}): HttpResponse<T> {
  return {
    status: 200,
    statusText: 'OK',
    headers: new Headers(headers),
    data,
    url: 'https://x.com',
  }
}

describe('authService', () => {
  it('round-trips base64 cookie encoding', () => {
    expect(decodeBase64(API_KEY)).toBe(COOKIE)
    expect(encodeBase64(COOKIE)).toBe(API_KEY)
  })

  it('extracts the user id from the cookie', () => {
    expect(AuthService.getUserId(API_KEY)).toBe('42')
    expect(() => AuthService.getUserId(encodeBase64('auth_token=abc'))).toThrow('Invalid authentication data')
  })

  it('rotates the api key from set-cookie entries', () => {
    const headers = new Headers()
    headers.append('set-cookie', 'ct0=new-csrf; Path=/')
    headers.append('set-cookie', 'auth_token=new-token; Path=/')

    const response: HttpResponse<unknown> = {
      status: 200,
      statusText: 'OK',
      headers,
      data: {},
      url: 'https://x.com',
    }

    const next = AuthService.getApiKeyFromReponse(response, new RettiwtConfig({ apiKey: API_KEY }))
    const cookie = decodeBase64(next!)

    expect(cookie).toContain('ct0=new-csrf')
    expect(cookie).toContain('auth_token=new-token')
    expect(cookie).toContain('twid=u%3D42')
  })

  it('ignores responses without auth cookies', () => {
    const response = jsonResponse({})
    expect(AuthService.getApiKeyFromReponse(response, new RettiwtConfig({ apiKey: API_KEY }))).toBeUndefined()
    expect(AuthService.getApiKeyFromReponse(jsonResponse({}), new RettiwtConfig())).toBeUndefined()
  })

  it('caches the guest credential per fetcher', async () => {
    const fetch = vi.fn(async () => jsonResponse({ guest_token: 'guest-token' }))
    const service = new AuthService(new RettiwtConfig({
      httpClient: { request: fetch as HttpClient['request'] },
    }))

    const first = await service.guest()
    const second = await service.guest()

    expect(first.guestToken).toBe('guest-token')
    expect(second).toBe(first)
    expect(fetch).toHaveBeenCalledOnce()
  })
})
