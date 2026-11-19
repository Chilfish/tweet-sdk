/** CLI configuration error: distinct from the core `TwitterApiError`, always mapped to `CONFIG_INVALID`. */
export type CliErrorCode = 'CONFIG_INVALID' | 'REQUEST_FAILED' | 'MEDIA_DOWNLOAD_FAILED'

export interface CliErrorOptions {
  code?: CliErrorCode
  context?: Record<string, unknown>
}

export class CliError extends Error {
  public readonly code: CliErrorCode
  public readonly context: Record<string, unknown>

  public constructor(message: string, options: CliErrorOptions = {}) {
    super(message)
    this.name = 'CliError'
    this.code = options.code ?? 'CONFIG_INVALID'
    this.context = options.context ?? {}
  }
}

/** Convenience constructor for `CONFIG_INVALID` (missing argument / invalid value). */
export function configError(message: string, context: Record<string, unknown> = {}): CliError {
  return new CliError(message, { code: 'CONFIG_INVALID', context })
}
