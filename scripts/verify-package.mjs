/**
 * Verify the published artifacts:
 * - required dist files exist
 * - the packed tarball contains no source, tests, or config
 * - every file referenced by exports actually exists
 *
 * `bun run build` must be run first.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const failures = []

function fail(message) {
  failures.push(message)
}

function collectTargets(value, targets = []) {
  if (typeof value === 'string') {
    targets.push(value)
  }
  else if (value && typeof value === 'object') {
    for (const nested of Object.values(value))
      collectTargets(nested, targets)
  }
  return targets
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

for (const target of collectTargets(pkg.exports)) {
  if (!target.startsWith('./'))
    continue
  if (!existsSync(new URL(`..${target.slice(1)}`, import.meta.url)))
    fail(`file referenced by exports does not exist: ${target}`)
}

for (const file of [
  'dist/index.js',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/index.d.cts',
  'dist/node.js',
  'dist/node.cjs',
  'dist/node.d.ts',
  'dist/node.d.cts',
  'dist/cli.js',
  'dist/cli.cjs',
  'dist/cli.d.ts',
  'dist/cli.d.cts',
  'dist/cli-bin.js',
]) {
  if (!existsSync(new URL(`../${file}`, import.meta.url)))
    fail(`missing build output: ${file}`)
}

for (const target of Object.values(pkg.bin ?? {})) {
  if (typeof target !== 'string' || !target.startsWith('./'))
    continue
  if (!existsSync(new URL(`..${target.slice(1)}`, import.meta.url)))
    fail(`file referenced by bin does not exist: ${target}`)
}

let packInfo
try {
  const packArgs = [
    'pack',
    '--dry-run',
    '--json',
    '--ignore-scripts',
  ]
  // On Windows npm is a .cmd, which execFile cannot run directly; go through cmd.exe.
  const output = process.platform === 'win32'
    ? execFileSync('cmd.exe', [
        '/d',
        '/s',
        '/c',
        `npm ${packArgs.join(' ')}`,
      ], {
        cwd: root,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    : execFileSync('npm', packArgs, {
        cwd: root,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
  packInfo = JSON.parse(output)[0]
}
catch (error) {
  fail(`npm pack --dry-run failed: ${error.message}`)
}

if (packInfo) {
  const files = new Set(packInfo.files.map(file => file.path))
  const required = [
    'package.json',
    'README.md',
    'LICENSE.md',
    'dist/index.js',
    'dist/index.cjs',
    'dist/index.d.ts',
    'dist/index.d.cts',
    'dist/cli.js',
    'dist/cli.cjs',
    'dist/cli-bin.js',
  ]

  for (const file of required) {
    if (!files.has(file))
      fail(`tarball is missing a required file: ${file}`)
  }

  for (const file of files) {
    if (file.startsWith('src/') || file.startsWith('tests/') || file.startsWith('scripts/') || file.startsWith('docs/') || file.startsWith('examples/'))
      fail(`tarball must not contain: ${file}`)
  }
}

if (failures.length > 0) {
  console.error('verify-package failed:')
  for (const message of failures)
    console.error(`  - ${message}`)
  process.exit(1)
}

console.log(`verify-package passed (${packInfo.files.length} files)`)
