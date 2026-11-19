import type { HttpClient, HttpResponse } from '../http/types'
import type { IErrorHandler } from './ErrorHandler'
import type { TidProvider } from './TidProvider'

/**
 * The configuration for initializing a client.
 *
 * Platform-neutral: the old `httpAgent` / `httpsAgent` / axios proxy fields are
 * gone. Anything transport-specific is injected through {@link httpClient}
 * (the `./node` entry provides a proxy-aware implementation).
 *
 * @public
 */
export interface IRettiwtConfig {
  /** The apiKey (base64-encoded cookie) used to authenticate against X. */
  apiKey?: string

  /** The max wait time (in milliseconds) for a response. */
  timeout?: number

  /** Whether to write logs to the configured logger. */
  logging?: boolean

  /** Optional hook invoked after every successful response. */
  responseMiddleware?: (response: HttpResponse) => void | Promise<void>

  /** Optional custom error hook, invoked before the error is rethrown. */
  errorHandler?: IErrorHandler

  /** Optional custom HTTP headers added to every request. */
  headers?: Record<string, string>

  /** Delay (ms) between concurrent requests, fixed or computed. */
  delay?: number | (() => number | Promise<number>)

  /** Maximum number of retries (mainly for intermittent 404s). */
  maxRetries?: number

  /** Injectable transport. Defaults to the global `fetch`. */
  httpClient?: HttpClient

  /** Injectable transaction-id provider. Defaults to the X shell scraper. */
  tidProvider?: TidProvider
}
