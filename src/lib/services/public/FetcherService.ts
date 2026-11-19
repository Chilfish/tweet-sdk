import type { ResourceType } from '../../enums/Resource'
import type { HttpRequest } from '../../http/types'
import type { RettiwtConfig } from '../../models/RettiwtConfig'
import type { IFetchArgs } from '../../types/args/FetchArgs'
import type { IPostArgs } from '../../types/args/PostArgs'
import type { IErrorHandler } from '../../types/ErrorHandler'

import { AllowGuestAuthenticationGroup, FetchResourcesGroup, PostResourcesGroup } from '../../collections/Groups'
import { Requests } from '../../collections/Requests'
import { ApiErrors } from '../../enums/Api'
import { LogActions } from '../../enums/Logging'
import { createBodyError, createHttpError } from '../../errors'
import { FetchArgs } from '../../models/args/FetchArgs'
import { PostArgs } from '../../models/args/PostArgs'
import { AuthCredential } from '../../models/auth/AuthCredential'
import { defaultTidProvider } from '../../transaction'
import { AuthService } from '../internal/AuthService'
import { LogService } from '../internal/LogService'

/**
 * The base service that handles all HTTP requests.
 *
 * Transport is an injected `HttpClient` (fetch by default), so the same code
 * runs on Workers/Deno/Bun/browsers/Node. Auth, retry and transaction-id
 * handling stay here.
 *
 * @public
 */
export class FetcherService {
  private readonly _auth: AuthService
  private readonly _delay?: number | (() => number | Promise<number>)
  private readonly _errorHandler?: IErrorHandler
  private readonly _timeout: number
  protected readonly config: RettiwtConfig

  public constructor(config: RettiwtConfig) {
    LogService.enabled = config.logging ?? false
    this.config = config
    this._delay = config.delay
    this._errorHandler = config.errorHandler
    this._timeout = config.timeout
    this._auth = new AuthService(config)
  }

  /** Checks authorization for the requested resource. */
  private _checkAuthorization(resource: ResourceType): void {
    LogService.log(LogActions.AUTHORIZATION, { authenticated: this.config.userId !== undefined })

    if (!AllowGuestAuthenticationGroup.includes(resource) && this.config.userId === undefined)
      throw new Error(ApiErrors.RESOURCE_NOT_ALLOWED)
  }

  /** Builds the credential for the current config (user cookie or guest token). */
  private async _getCredential(): Promise<AuthCredential> {
    if (this.config.apiKey) {
      LogService.log(LogActions.GET, { target: 'USER_CREDENTIAL' })
      return new AuthCredential(AuthService.decodeCookie(this.config.apiKey))
    }

    LogService.log(LogActions.GET, { target: 'NEW_GUEST_CREDENTIAL' })
    return this._auth.guest()
  }

  /** Generates the `x-client-transaction-id` header for a request. */
  private async _getTransactionHeader(method: string, url: string): Promise<Record<string, string>> {
    const provider = this.config.tidProvider ?? defaultTidProvider
    return provider.getHeader({
      method,
      url,
      cookie: this.config.apiKey
        ? AuthService.decodeCookie(this.config.apiKey)
        : undefined,
      headers: this.config.headers,
      client: this.config.httpClient,
    })
  }

  private _validateArgs(
    resource: ResourceType,
    args: IFetchArgs | IPostArgs,
  ): FetchArgs | PostArgs | undefined {
    if (FetchResourcesGroup.includes(resource)) {
      LogService.log(LogActions.VALIDATE, { target: 'FETCH_ARGS' })
      return new FetchArgs(args)
    }
    if (PostResourcesGroup.includes(resource)) {
      LogService.log(LogActions.VALIDATE, { target: 'POST_ARGS' })
      return new PostArgs(args)
    }
    return undefined
  }

  /** Introduces a delay using the configured delay/delay function. */
  private async _wait(): Promise<void> {
    if (this._delay === undefined || this._delay === 0)
      return

    const delay = typeof this._delay === 'number'
      ? this._delay
      : await this._delay()

    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /** External error hook: custom handlers may throw their own error. */
  private _handleError(error: unknown, resource: ResourceType): never {
    if (this._errorHandler) {
      this._errorHandler.handle(error)
      throw error
    }

    if (error instanceof Error)
      throw error

    throw createHttpError(500, 'Unknown error', error, resource)
  }

  /**
   * Makes an HTTP request according to the given resource and args.
   *
   * @typeParam T - The type of the returned response data.
   */
  public async request<T = unknown>(resource: ResourceType, args: IFetchArgs | IPostArgs): Promise<T> {
    let retry = 0
    let error: unknown

    LogService.log(LogActions.REQUEST, { resource, args })

    this._checkAuthorization(resource)
    const parsedArgs = this._validateArgs(resource, args)!
    const credential = await this._getCredential()
    const descriptor = Requests[resource](parsedArgs)

    do {
      try {
        const tidHeader = await this._getTransactionHeader(descriptor.method ?? 'get', descriptor.url)
        const request: HttpRequest = {
          ...descriptor,
          headers: {
            ...tidHeader,
            ...credential.toHeader(),
            ...this.config.headers,
            ...descriptor.headers,
          },
          timeout: this._timeout || undefined,
        }

        await this._wait()

        const response = await this.config.httpClient.request<T>(request)

        if (response.status < 200 || response.status >= 300)
          throw createHttpError(response.status, response.statusText, response.data, resource)

        const bodyError = createBodyError(response.data, resource)
        if (bodyError)
          throw bodyError

        if (this.config.responseMiddleware !== undefined)
          await this.config.responseMiddleware(response)

        return response.data as T
      }
      catch (err) {
        if (
          typeof err === 'object'
          && err !== null
          && (err as { status?: number }).status === 404
          && retry + 1 < this.config.maxRetries
        ) {
          error = err
          continue
        }

        this._handleError(err, resource)
      }
      finally {
        retry++
      }
    } while (retry < this.config.maxRetries)

    throw error
  }
}
