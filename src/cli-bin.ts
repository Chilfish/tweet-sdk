#!/usr/bin/env node
/**
 * bin entry: the only module allowed to have top-level side effects; not exposed through `package.json#exports`.
 *
 * Only the dependency-free version check is a static import; every other module is loaded dynamically —
 * on older Node versions, evaluating the dependencies throws an internal error first, so users would see
 * the dependency rather than "Node is too old".
 */
import process from 'node:process'
import { isSupportedNodeVersion, nodeVersionError } from './cli/nodeVersion'

async function bootstrap(): Promise<void> {
  const current = process.versions.node
  if (!isSupportedNodeVersion(current)) {
    console.error(nodeVersionError(current))
    process.exit(1)
  }

  const [{ runMain }, { main, withErrorEnvelope }, { assertKnownFlags }, { showCliUsage }, { formatCliError }] = await Promise.all([
    import('citty'),
    import('./cli'),
    import('./cli/validateArgs'),
    import('./cli/usage'),
    import('./cli/shared'),
  ])

  try {
    await assertKnownFlags(main, process.argv.slice(2))
  }
  catch (error) {
    console.error(JSON.stringify(formatCliError(error)))
    process.exit(1)
  }

  await runMain(withErrorEnvelope(main), { showUsage: showCliUsage })
}

bootstrap().catch((error: unknown) => {
  console.error(JSON.stringify({
    event: 'error',
    code: 'UNKNOWN',
    message: error instanceof Error
      ? error.message
      : String(error),
  }))
  process.exit(1)
})
