/**
 * Minimum Node version check.
 *
 * Kept as a standalone module with zero dependencies: the bin entry must call it before loading the
 * SDK (citty / undici), otherwise older Node versions throw an internal error during module
 * evaluation first, and users would see the dependency rather than "Node is too old".
 */

/** Kept in sync with `package.json#engines.node`. */
export const MIN_NODE_VERSION: readonly [major: number, minor: number] = [20, 0]

/** Whether `process.versions.node` (e.g. `22.23.4`) meets the minimum. */
export function isSupportedNodeVersion(current: string): boolean {
  const [major = 0, minor = 0] = current.split('.').map(Number)
  const [minMajor, minMinor] = MIN_NODE_VERSION
  return major > minMajor || (major === minMajor && minor >= minMinor)
}

/** One-line error shown to the user when the version is too old. */
export function nodeVersionError(current: string): string {
  const [minMajor, minMinor] = MIN_NODE_VERSION
  return `tweet-cli requires Node >= ${minMajor}.${minMinor} (current: v${current}).\n`
    + 'Upgrade Node from https://nodejs.org/ and run the command again.'
}
