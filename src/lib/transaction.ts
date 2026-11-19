import type { HttpClient } from './http/types'

import type { TidProvider } from './types/TidProvider'
import { parseHTML } from 'linkedom'

import { ClientTransaction } from 'x-client-transaction-id'
import { decodeBase64 } from './http/base64'

/**
 * Client transaction id generation.
 *
 * X gates GraphQL requests behind an `x-client-transaction-id` header derived
 * from the JS chunk map (`ondemand.s`) of the legacy web shell. The shell is
 * only served to an authenticated session, hence the cookie attachment.
 *
 * The HTML probing lives here so core stays transport-neutral: callers inject
 * the {@link HttpClient} used to fetch the shell.
 */

/**
 * Candidate URLs for the X shell document that drives `ClientTransaction`.
 *
 * The `ondemand.s` webpack chunk map required by `x-client-transaction-id` only
 * remains in the legacy shell, and X serves that legacy shell only to an
 * authenticated session (see `buildXShellHeaders`). The canonical homepage comes
 * first; the remaining routes still return the legacy shell anonymously, as a
 * fallback for deployments without an API key.
 */
export const X_SHELL_URLS = [
  'https://x.com/home',
  'https://x.com/i/topics',
  'https://x.com/i/display',
  'https://x.com/i/timeline',
  'https://x.com/i/communitynotes',
]

/**
 * Builds the headers used to fetch the X shell document.
 *
 * X only serves the shell containing the `ondemand.s` chunk map to an
 * authenticated session, so the decoded cookie must be attached whenever an API
 * key is configured. An anonymous request returns the new Rolldown/Vite build
 * (which dropped the chunk map), making `ClientTransaction` uninitializable.
 */
export function buildXShellHeaders(
  headers: Record<string, string>,
  apiKey?: string,
): Record<string, string> {
  const shellHeaders = { ...headers }
  if (apiKey)
    shellHeaders.cookie = decodeBase64(apiKey)
  return shellHeaders
}

/**
 * Whether the given document is a usable legacy X shell for client transaction
 * ID generation: it must expose both the site verification key and the
 * `ondemand.s` chunk reference consumed by `ClientTransaction`.
 */
export function isUsableXDocument(document: Document): boolean {
  const hasVerificationKey = document.querySelector('[name=\'twitter-site-verification\']') !== null
  const hasOnDemandChunk = (document.documentElement?.outerHTML ?? '').includes('ondemand.s')
  return hasVerificationKey && hasOnDemandChunk
}

const MIGRATION_REDIRECT_RE = /(https?:\/\/(?:www\.)?(twitter|x)\.com(\/x)?\/migrate([/?])?tok=[\w%\-]+)+/i

async function readText(client: HttpClient, url: string, headers: Record<string, string>): Promise<string> {
  const response = await client.request<string>({ url, headers })
  return typeof response.data === 'string'
    ? response.data
    : JSON.stringify(response.data ?? '')
}

/**
 * Fetches and normalizes one X page into a DOM document, following the legacy
 * migration redirect/form when X still serves one.
 */
async function fetchXPage(
  client: HttpClient,
  url: string,
  headers: Record<string, string>,
): Promise<Document> {
  const html = await readText(client, url, headers)
  let document = parseHTML(html).document

  const metaRefresh = document.querySelector('meta[http-equiv=\'refresh\']')
  const metaContent = metaRefresh
    ? metaRefresh.getAttribute('content') || ''
    : ''
  const migrationUrl
    = MIGRATION_REDIRECT_RE.exec(metaContent) || MIGRATION_REDIRECT_RE.exec(html)

  if (migrationUrl) {
    const redirectHtml = await readText(client, migrationUrl[0], headers)
    document = parseHTML(redirectHtml).document
  }

  const migrationForm
    = document.querySelector('form[name=\'f\']')
      || document.querySelector('form[action=\'https://x.com/x/migrate\']')

  if (migrationForm) {
    const formUrl = migrationForm.getAttribute('action') || 'https://x.com/x/migrate'
    const method = migrationForm.getAttribute('method') || 'POST'
    const payload = new FormData()

    for (const element of Array.from(migrationForm.querySelectorAll('input'))) {
      const name = element.getAttribute('name')
      const value = element.getAttribute('value')
      if (name && value)
        payload.append(name, value)
    }

    const response = await client.request<string>({
      url: formUrl,
      method: method.toUpperCase(),
      data: payload,
      headers: {
        ...headers,
        'content-type': 'multipart/form-data',
      },
    })

    const body = typeof response.data === 'string'
      ? response.data
      : ''
    document = parseHTML(body).document
  }

  return document
}

/**
 * Resolves a DOM document that can drive `ClientTransaction` initialization.
 *
 * X's new Rolldown/Vite shell dropped the `ondemand.s` webpack chunk map, so a
 * fixed `/home` fetch fails with `OnDemandFileUrlResolutionError`. We probe the
 * candidates in {@link X_SHELL_URLS} and return the first usable shell, falling
 * back to the last parsed document so the library can raise its own specific
 * initialization error.
 */
export async function fetchTransactionDocument(
  client: HttpClient,
  headers: Record<string, string>,
  cookie?: string,
): Promise<Document> {
  let lastDocument: Document | undefined
  let lastError: unknown
  const shellHeaders = cookie
    ? { ...headers, cookie }
    : headers

  for (const url of X_SHELL_URLS) {
    try {
      const document = await fetchXPage(client, url, shellHeaders)
      if (isUsableXDocument(document))
        return document
      lastDocument = document
    }
    catch (error) {
      lastError = error
    }
  }

  if (lastDocument)
    return lastDocument

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to fetch the X page shell required to generate the client transaction ID')
}

/** Default provider: scrapes the X shell and derives the transaction id. */
export const defaultTidProvider: TidProvider = {
  async getHeader({ method, url, cookie, headers, client }) {
    const document = await fetchTransactionDocument(client, headers, cookie)
    const transaction = await ClientTransaction.create(document)
    const path = new URL(url).pathname.split('?')[0]!.trim()
    const tid = await transaction.generateTransactionId(method.toUpperCase(), path)

    return { 'x-client-transaction-id': tid }
  },
}
