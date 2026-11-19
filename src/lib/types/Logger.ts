/**
 * Minimal structured logger shared by the pool, the enrichment helpers and the
 * Space attachment step.
 *
 * Events are namespaced strings (`pool.rotate`, `jetfuel.parse.fallback`, …)
 * and fields are plain JSON-serializable values, so consumers can forward them
 * into `console`, pino, Workers observability or their own dashboard contract
 * without the SDK depending on a logging library.
 *
 * @public
 */
export interface Logger {
  warn?: (event: string, fields?: Record<string, unknown>) => void
}
