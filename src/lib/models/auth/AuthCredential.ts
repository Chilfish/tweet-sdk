import type { IAuthCredential } from '../../types/auth/AuthCredential'

import { AuthenticationType } from '../../enums/Authentication'

import { AuthCookie } from './AuthCookie'

/** The public web bearer token X's own client ships with. */
const BEARER_TOKEN
  = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'

/**
 * The credentials for authenticating against X.
 *
 * Depending on which tokens are present, the authentication type is determined:
 * - guestToken only =\> Guest authentication.
 * - cookie + guestToken =\> Guest authentication while logging in.
 * - cookie only =\> User authentication.
 *
 * @internal
 */
export class AuthCredential implements IAuthCredential {
  public authToken?: string
  public authenticationType?: AuthenticationType
  public cookies?: string
  public csrfToken?: string
  public guestToken?: string

  /**
   * @param cookieString - The raw cookie string, when authenticating as a user.
   * @param guestToken - The guest token, when authenticating as a guest.
   */
  public constructor(cookieString?: string, guestToken?: string) {
    this.authToken = BEARER_TOKEN

    if (cookieString && guestToken) {
      const parsedCookie = new AuthCookie(cookieString)
      this.cookies = parsedCookie.toString()
      this.guestToken = guestToken
      this.authenticationType = AuthenticationType.LOGIN
    }
    else if (cookieString) {
      const parsedCookie = new AuthCookie(cookieString)
      this.cookies = parsedCookie.toString()
      this.csrfToken = parsedCookie.ct0
      this.authenticationType = AuthenticationType.USER
    }
    else if (guestToken) {
      this.guestToken = guestToken
      this.authenticationType = AuthenticationType.GUEST
    }
  }

  /** @returns The HTTP headers for `this` credential. */
  public toHeader(): Record<string, string> {
    const headers: Record<string, string> = {}

    if (this.authToken)
      headers.authorization = `Bearer ${this.authToken}`
    if (this.guestToken)
      headers['x-guest-token'] = this.guestToken
    if (this.csrfToken)
      headers['x-csrf-token'] = this.csrfToken
    if (this.cookies)
      headers.cookie = this.cookies

    return headers
  }
}
