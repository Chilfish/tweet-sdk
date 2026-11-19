import type { HttpClient } from '../http/types'

/**
 * Context handed to a transaction-id provider.
 *
 * The default provider scrapes the X shell for the `ondemand.s` chunk map, but
 * runtimes that cannot parse HTML can inject a static/side-channel provider
 * (see `tidProvider` in `IRettiwtConfig`).
 */
export interface TidContext {
  method: string
  url: string
  /** Decoded cookie string, when an API key is configured. */
  cookie?: string
  /** Base headers used for the shell request. */
  headers: Record<string, string>
  /** Transport used to fetch the shell document. */
  client: HttpClient
}

export interface TidProvider {
  getHeader: (context: TidContext) => Promise<Record<string, string>>
}

/** The header carrying the generated transaction id. */
export interface ITransactionHeader {
  'x-client-transaction-id': string
}
