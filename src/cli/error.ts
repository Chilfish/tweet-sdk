/** CLI 配置错误：与核心的 `TwitterApiError` 区分，统一映射到 `CONFIG_INVALID`。 */
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

/** 便捷构造 `CONFIG_INVALID`（参数缺失 / 取值非法）。 */
export function configError(message: string, context: Record<string, unknown> = {}): CliError {
  return new CliError(message, { code: 'CONFIG_INVALID', context })
}
