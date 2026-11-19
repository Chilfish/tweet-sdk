#!/usr/bin/env node
/**
 * bin 入口：唯一允许顶层副作用的模块，不通过 `package.json#exports` 暴露。
 *
 * 只用静态 import 引入无依赖的版本检查；其余模块全部动态加载——低版本 Node
 * 在求值依赖时会先抛内部错误，用户看到的会是依赖而不是「Node 太旧」。
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
