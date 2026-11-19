import type { HttpClient, HttpRequest, HttpResponse } from './types'
import { buildUrl } from './url'

export interface FetchHttpClientOptions {
  /** Fetch implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch
  /**
   * Extra request init computed per request (may be async). The `./node` entry
   * uses this to attach an undici dispatcher for proxying.
   */
  init?: (request: HttpRequest) => RequestInit | Promise<RequestInit | undefined> | undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null)
    return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function isJsonResponse(contentType: string | null, text: string): boolean {
  if (contentType?.includes('json'))
    return true
  const head = text.trimStart()[0]
  return head === '{' || head === '['
}

function parseBody<T>(response: Response, text: string): T {
  if (!text)
    return undefined as T
  if (isJsonResponse(response.headers.get('content-type'), text)) {
    try {
      return JSON.parse(text) as T
    }
    catch {
      return text as T
    }
  }
  return text as T
}

function prepareBody(data: unknown, headers: Headers): BodyInit | undefined {
  if (data === undefined || data === null)
    return undefined

  if (typeof data === 'string') {
    if (!headers.has('content-type'))
      headers.set('content-type', 'application/x-www-form-urlencoded')
    return data
  }

  if (typeof FormData !== 'undefined' && data instanceof FormData)
    return data

  if (typeof Blob !== 'undefined' && data instanceof Blob)
    return data

  if (data instanceof Uint8Array)
    return new Blob([data as BlobPart])

  if (isPlainObject(data) || Array.isArray(data)) {
    if (!headers.has('content-type'))
      headers.set('content-type', 'application/json')
    return JSON.stringify(data)
  }

  return String(data)
}

async function execute<T>(request: HttpRequest, options: FetchHttpClientOptions): Promise<HttpResponse<T>> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  if (!fetchImpl)
    throw new Error('No fetch implementation available; pass one via FetchHttpClientOptions.fetch')

  const url = buildUrl(request.url, request.params)
  const headers = new Headers(request.headers)
  const body = prepareBody(request.data, headers)

  const init: RequestInit = {
    method: (request.method ?? 'GET').toUpperCase(),
    headers,
    body,
    ...(await options.init?.(request)),
  }

  if (request.signal)
    init.signal = request.signal
  else if (request.timeout && request.timeout > 0)
    init.signal = AbortSignal.timeout(request.timeout)

  const response = await fetchImpl(url, init)
  const text = await response.text()

  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: parseBody<T>(response, text),
    url: response.url || url,
  }
}

/** Creates a fetch-backed {@link HttpClient}. */
export function createFetchHttpClient(options: FetchHttpClientOptions = {}): HttpClient {
  return {
    request: <T = unknown>(request: HttpRequest) => execute<T>(request, options),
  }
}

/** The shared default client used when no transport is injected. */
export const defaultHttpClient: HttpClient = createFetchHttpClient()
