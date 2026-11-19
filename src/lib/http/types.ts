/**
 * Transport-neutral HTTP types.
 *
 * Request builders (`collections/Requests.ts`, `requests/*`) return descriptors
 * of this shape; the actual wire transport is an injectable {@link HttpClient}.
 * Keeping the descriptor free of axios/fetch specifics is what lets the core
 * run on Workers, Deno, Bun, browsers and Node alike.
 */

/** Query parameters. `undefined` / `null` values are dropped. */
export type HttpQueryParams = Record<string, string | number | boolean | null | undefined>

/**
 * A single HTTP request.
 *
 * - `data` as a plain object is sent as JSON.
 * - `data` as a string is sent as `application/x-www-form-urlencoded`.
 * - `data` as `FormData` / `Blob` / `Uint8Array` is sent as the raw body.
 */
export interface HttpRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  params?: HttpQueryParams
  data?: unknown
  /** Request timeout in milliseconds. */
  timeout?: number
  signal?: AbortSignal
}

export interface HttpResponse<T = unknown> {
  status: number
  statusText: string
  headers: Headers
  data: T
  url: string
}

/** Minimal transport contract. Default implementation is fetch-based. */
export interface HttpClient {
  request: <T = unknown>(request: HttpRequest) => Promise<HttpResponse<T>>
}
