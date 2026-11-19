/**
 * `@chilfish/tweet/node` — Node adapters.
 *
 * Import from here only in Node runtimes: it pulls `node:fs` and the undici
 * proxy dispatcher.
 */

export type { CreateNodeClientOptions } from './node/index'
export { createNodeClient, createProxyFetch, readMediaFile } from './node/index'
