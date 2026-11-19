/**
 * 解析 CLI 的正整数参数（页码 / 数量等）。
 *
 * 非法值（空串、非数字、`< 1`）返回 `undefined`，由调用方按「未指定」处理，
 * 避免把 `0` 之类的值透传给从 1 开始计数的上游端点。
 */
export function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '')
    return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1)
    return undefined
  return Math.floor(parsed)
}

/** 解析允许 0 的非负整数（重试次数等）。 */
export function parseNonNegativeInt(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '')
    return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0)
    return undefined
  return Math.floor(parsed)
}
