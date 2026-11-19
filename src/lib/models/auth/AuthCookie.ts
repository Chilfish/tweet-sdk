import type { IAuthCookie } from '../../types/auth/AuthCookie'

/**
 * The cookie containing the tokens that are used to authenticate against X.
 *
 * Input is the raw `k=v; k=v` cookie string (base64 already decoded); the
 * `cookiejar` dependency is no longer needed for this.
 *
 * @internal
 */
export class AuthCookie implements IAuthCookie {
  public auth_token: string
  public ct0: string
  public kdt: string
  public twid: string

  public constructor(cookies: string) {
    this.auth_token = ''
    this.ct0 = ''
    this.kdt = ''
    this.twid = ''

    for (const entry of cookies.split(';')) {
      const trimmed = entry.trim()
      const separator = trimmed.indexOf('=')
      if (separator < 1)
        continue

      const name = trimmed.slice(0, separator).trim()
      const value = trimmed.slice(separator + 1).trim()

      if (name === 'kdt')
        this.kdt = value
      else if (name === 'twid')
        this.twid = value
      else if (name === 'ct0')
        this.ct0 = value
      else if (name === 'auth_token')
        this.auth_token = value
    }
  }

  /** @returns the string representation of `this` object. */
  public toString(): string {
    let outStr = ''
    for (const [key, value] of Object.entries(this))
      outStr += `${key}=${value as string};`
    return outStr
  }
}
