import type { ResourceType } from './enums/Resource'

/**
 * Errors raised by the X endpoints.
 *
 * The classifier in `RettiwtPool` reads `status` directly instead of guessing
 * from axios-shaped error objects, so subclasses only need to carry the fields
 * that callers actually branch on.
 */

export interface TwitterApiErrorOptions {
  status?: number
  code?: number
  resource?: ResourceType
  details?: unknown
  cause?: unknown
}

export class TwitterApiError extends Error {
  public readonly status?: number
  public readonly code?: number
  public readonly resource?: ResourceType
  public readonly details?: unknown

  public constructor(message: string, options: TwitterApiErrorOptions = {}) {
    super(message, options.cause === undefined
      ? undefined
      : { cause: options.cause })
    this.name = 'TwitterApiError'
    this.status = options.status
    this.code = options.code
    this.resource = options.resource
    this.details = options.details
  }
}

/** HTTP 429 — the key hit a rate-limit window. */
export class RateLimitError extends TwitterApiError {
  public constructor(message: string, options: TwitterApiErrorOptions = {}) {
    super(message, { ...options, status: options.status ?? 429 })
    this.name = 'RateLimitError'
  }
}

/** HTTP 401 / 403 — the credential is invalid or rejected for this egress IP. */
export class AuthError extends TwitterApiError {
  public constructor(message: string, options: TwitterApiErrorOptions = {}) {
    super(message, { ...options, status: options.status ?? 401 })
    this.name = 'AuthError'
  }
}

/** HTTP 404 or a `TweetTombstone` payload. */
export class NotFoundError extends TwitterApiError {
  public constructor(message: string, options: TwitterApiErrorOptions = {}) {
    super(message, { status: 404, ...options })
    this.name = 'NotFoundError'
  }
}

interface ErrorPayload {
  errors?: Array<{ code?: number, message?: string }>
  data?: unknown
}

/** Extracts the first API error code/message out of a GraphQL error body. */
function readErrorPayload(payload: unknown): { code?: number, message?: string } {
  if (!payload || typeof payload !== 'object')
    return {}
  const errors = (payload as ErrorPayload).errors
  const first = Array.isArray(errors)
    ? errors[0]
    : undefined
  return {
    code: typeof first?.code === 'number'
      ? first.code
      : undefined,
    message: typeof first?.message === 'string'
      ? first.message
      : undefined,
  }
}

/** Maps a non-2xx response to the matching error subclass. */
export function createHttpError(
  status: number,
  statusText: string,
  payload: unknown,
  resource?: ResourceType,
): TwitterApiError {
  const { code, message } = readErrorPayload(payload)
  const text = message ?? (statusText || `HTTP ${status}`)
  const options: TwitterApiErrorOptions = {
    status,
    code,
    resource,
    details: payload,
  }

  if (status === 429)
    return new RateLimitError(text, options)
  if (status === 401 || status === 403)
    return new AuthError(text, options)
  if (status === 404)
    return new NotFoundError(text, options)
  return new TwitterApiError(text, options)
}

/**
 * X sometimes answers `200 OK` with an `errors` array and an empty `data`.
 * Those payloads are errors too, and the caller should retry / rotate keys.
 */
export function createBodyError(
  payload: unknown,
  resource?: ResourceType,
): TwitterApiError | undefined {
  if (!payload || typeof payload !== 'object')
    return undefined

  const body = payload as ErrorPayload
  if (!Array.isArray(body.errors) || body.errors.length === 0)
    return undefined
  if (body.data !== undefined && JSON.stringify(body.data) !== JSON.stringify({}))
    return undefined

  const { code, message } = readErrorPayload(payload)
  return new TwitterApiError(message ?? 'Twitter API error', {
    status: code === 32
      ? 401
      : 200,
    code,
    resource,
    details: payload,
  })
}
