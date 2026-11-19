/**
 * Node 版本下限检查。
 *
 * 单独成模块且不引入任何依赖：bin 入口必须在加载 SDK（citty / undici）之前
 * 调用它，否则低版本 Node 会先在模块求值阶段抛出内部错误，用户看到的会是
 * 依赖而不是「Node 太旧」。
 */

/** 与 `package.json#engines.node` 保持一致。 */
export const MIN_NODE_VERSION: readonly [major: number, minor: number] = [20, 0]

/** `process.versions.node`（如 `22.23.4`）是否满足下限。 */
export function isSupportedNodeVersion(current: string): boolean {
  const [major = 0, minor = 0] = current.split('.').map(Number)
  const [minMajor, minMinor] = MIN_NODE_VERSION
  return major > minMajor || (major === minMajor && minor >= minMinor)
}

/** 版本不足时给用户看的一行错误。 */
export function nodeVersionError(current: string): string {
  const [minMajor, minMinor] = MIN_NODE_VERSION
  return `tweet-cli requires Node >= ${minMajor}.${minMinor} (current: v${current}).\n`
    + 'Upgrade Node from https://nodejs.org/ and run the command again.'
}
