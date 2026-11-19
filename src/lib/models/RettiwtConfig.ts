import type { HttpClient, HttpResponse } from '../http/types'
import type { IErrorHandler } from '../types/ErrorHandler'
import type { IRettiwtConfig } from '../types/RettiwtConfig'

import type { TidProvider } from '../types/TidProvider'
import { defaultHttpClient } from '../http/fetch'
import { AuthService } from '../services/internal/AuthService'

/**
 * The default headers.
 *
 * @public
 */
const DefaultHeaders = {

  'Authority': 'x.com',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Referer': 'https://x.com',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
  'X-Twitter-Active-User': 'yes',
  'X-Twitter-Client-Language': 'en',

}

/**
 * The default per-request timeout (ms).
 *
 * `fetch` has no timeout by default, so a stalled upstream would hang forever.
 * Set `timeout: 0` to disable it (for long media uploads).
 */
const DEFAULT_TIMEOUT = 30_000

/**
 * Runtime configuration shared by the fetcher and the pool.
 *
 * @public
 */
export class RettiwtConfig implements IRettiwtConfig {
  private _apiKey?: string
  private _headers: Record<string, string>
  private _userId: string | undefined

  public readonly delay?: number | (() => number | Promise<number>)
  public readonly errorHandler?: IErrorHandler
  public readonly logging?: boolean
  public readonly maxRetries: number
  public readonly responseMiddleware?: (response: HttpResponse) => void | Promise<void>
  public readonly timeout: number
  public readonly httpClient: HttpClient
  public readonly tidProvider?: TidProvider

  public constructor(config?: IRettiwtConfig) {
    this._apiKey = config?.apiKey
    this._userId = config?.apiKey
      ? AuthService.getUserId(config.apiKey)
      : undefined
    this.delay = config?.delay ?? 0
    this.maxRetries = config?.maxRetries ?? 0
    this.errorHandler = config?.errorHandler
    this.responseMiddleware = config?.responseMiddleware
    this.logging = config?.logging
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT
    this.httpClient = config?.httpClient ?? defaultHttpClient
    this.tidProvider = config?.tidProvider
    this._headers = {
      ...DefaultHeaders,
      ...config?.headers,
    }
  }

  public get apiKey(): string | undefined {
    return this._apiKey
  }

  public set apiKey(apiKey: string | undefined) {
    this._apiKey = apiKey
    this._userId = apiKey
      ? AuthService.getUserId(apiKey)
      : undefined
  }

  public get headers(): Record<string, string> {
    return this._headers
  }

  public set headers(headers: Record<string, string> | undefined) {
    this._headers = {
      ...DefaultHeaders,
      ...headers,
    }
  }

  /** The ID of the user associated with the API key, if any. */
  public get userId(): string | undefined {
    return this._userId
  }
}

export { DefaultHeaders as DefaultRettiwtHeaders }
