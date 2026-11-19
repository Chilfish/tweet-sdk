import type { HttpResponse } from '../../http/types'
import type { RettiwtConfig } from '../../models/RettiwtConfig'

import { ApiErrors } from '../../enums/Api'
import { decodeBase64, encodeBase64 } from '../../http/base64'
import { AuthCredential } from '../../models/auth/AuthCredential'

/**
 * The service that handles authentication.
 *
 * @internal
 */
export class AuthService {
  private readonly _config: RettiwtConfig

  public constructor(config: RettiwtConfig) {
    this._config = config
  }

  /** Splits the set-cookie header into individual `key=value; attrs` entries. */
  private static _splitCookieHeader(cookieHeader: string | string[]): string[] {
    if (Array.isArray(cookieHeader))
      return cookieHeader
    return cookieHeader.split(/,(?=[^;,]+=)/g)
  }

  private static _readSetCookie(response: HttpResponse): string | string[] | undefined {
    const headers = response.headers
    if (typeof headers.getSetCookie === 'function') {
      const cookies = headers.getSetCookie()
      if (cookies.length)
        return cookies
    }
    return headers.get('set-cookie') ?? undefined
  }

  /** Decodes the base64-encoded cookie string. */
  public static decodeCookie(encodedCookies: string): string {
    return decodeBase64(encodedCookies)
  }

  /** Encodes a cookie string to base64. */
  public static encodeCookie(cookieString: string): string {
    return encodeBase64(cookieString)
  }

  /**
   * Gets a rotated API key from an HTTP response's `set-cookie` header, when the
   * upstream session refreshed any of the auth cookies.
   */
  public static getApiKeyFromReponse(
    response: HttpResponse,
    config?: RettiwtConfig,
  ): string | undefined {
    const setCookie = AuthService._readSetCookie(response)
    if (setCookie === undefined || config?.apiKey === undefined)
      return

    const requiredCookieNames = new Set(['auth_token', 'ct0', 'kdt', 'twid'])
    const currentCookieString = AuthService.decodeCookie(config.apiKey)
    const cookies = AuthService._splitCookieHeader(setCookie)
    const cookiesMap = new Map<string, string>()

    for (const cookieEntry of currentCookieString.split(';')) {
      const trimmedEntry = cookieEntry.trim()
      const separatorIndex = trimmedEntry.indexOf('=')
      if (!trimmedEntry || separatorIndex < 1)
        continue

      const key = trimmedEntry.slice(0, separatorIndex).trim()
      const value = trimmedEntry.slice(separatorIndex + 1).trim()
      if (!key || !value || !requiredCookieNames.has(key))
        continue

      cookiesMap.set(key, value)
    }

    let hasUpdate = false
    for (const cookie of cookies) {
      const cookieValuePair = cookie.split(';', 1)[0]?.trim()
      const separatorIndex = cookieValuePair?.indexOf('=') ?? -1
      if (!cookieValuePair || separatorIndex < 1)
        continue

      const key = cookieValuePair.slice(0, separatorIndex).trim()
      const value = cookieValuePair.slice(separatorIndex + 1).trim()
      if (!key || !value || !requiredCookieNames.has(key))
        continue

      cookiesMap.set(key, value)
      hasUpdate = true
    }

    if (!hasUpdate || !cookiesMap.has('twid'))
      return

    let mergedCookieString = ''
    for (const [key, value] of cookiesMap.entries())
      mergedCookieString += `${key}=${value};`

    if (!mergedCookieString)
      return

    try {
      return AuthService.encodeCookie(mergedCookieString)
    }
    catch {
      return undefined
    }
  }

  /** Gets the user's id from the given API key. */
  public static getUserId(apiKey: string): string {
    const cookieString = AuthService.decodeCookie(apiKey)
    const searchResults = cookieString.match(
      /((?<=twid="u=)(\d+)(?="))|((?<=twid=u%3D)(\d+)(?=;))/,
    )

    if (searchResults)
      return searchResults[0]

    throw new Error(ApiErrors.BAD_AUTHENTICATION)
  }

  /**
   * Fetches a fresh CSRF token with a lightweight authenticated request, then
   * rotates the API key with the updated cookie.
   */
  public static async refreshCsrfToken(config: RettiwtConfig): Promise<void> {
    if (config.apiKey === undefined)
      return

    try {
      const credential = new AuthCredential(AuthService.decodeCookie(config.apiKey))
      const response = await config.httpClient.request({
        url: 'https://x.com/i/api/1.1/account/verify_credentials.json',
        headers: {
          ...credential.toHeader(),
          authorization:
            'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        },
        timeout: config.timeout,
      })

      const newApiKey = AuthService.getApiKeyFromReponse(response, config)
      if (newApiKey !== undefined)
        config.apiKey = newApiKey
    }
    catch {
      // If the ct0 refresh fails, leave the apiKey as-is.
    }
  }

  /** Logs in as a guest and returns the resulting credential. */
  public async guest(): Promise<AuthCredential> {
    const credential = new AuthCredential()
    const response = await this._config.httpClient.request<{ guest_token: string }>({
      url: 'https://api.twitter.com/1.1/guest/activate.json',
      method: 'POST',
      headers: credential.toHeader(),
      timeout: this._config.timeout,
    })

    credential.guestToken = response.data.guest_token
    return credential
  }
}
