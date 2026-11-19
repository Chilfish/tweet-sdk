/**
 * Runs the runtime smoke inside workerd through Miniflare.
 *
 * `bun build` produces a single worker module from `smoke-worker-entry.mjs`
 * (which imports the built `dist/index.js`); Miniflare then loads that bundle
 * so the test proves the package is importable and usable on Workers, not just
 * on Node.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Miniflare } from 'miniflare'

const root = fileURLToPath(new URL('..', import.meta.url))
const temp = mkdtempSync(join(tmpdir(), 'tweet-sdk-workers-'))
const outfile = join(temp, 'worker.mjs')

let mf
try {
  execFileSync('bun', [
    'build',
    join(root, 'scripts/smoke-worker-entry.mjs'),
    '--outfile',
    outfile,
    '--target',
    'browser',
    '--format',
    'esm',
    '--external',
    'undici',
  ], {
    cwd: root,
    stdio: 'inherit',
  })

  mf = new Miniflare({
    modules: true,
    scriptPath: outfile,
    compatibilityDate: '2025-01-01',
    compatibilityFlags: ['nodejs_compat'],
  })

  const response = await mf.dispatchFetch('http://localhost/')
  const body = await response.text()
  if (response.status !== 200)
    throw new Error(`workers runtime smoke failed (${response.status}): ${body}`)
}
finally {
  if (mf)
    await mf.dispose()
  rmSync(temp, { recursive: true, force: true })
}

console.log('workers runtime smoke passed')
