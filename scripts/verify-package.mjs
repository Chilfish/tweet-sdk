/**
 * 校验发布产物：
 * - 必需的 dist 文件存在
 * - 打出的 tarball 不包含源码/测试/配置
 * - exports 指向的文件真实存在
 *
 * 运行前必须先 `bun run build`。
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
    fail(`exports 指向的文件不存在: ${target}`)
}

for (const file of [
  'dist/index.js',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/index.d.cts',
]) {
  if (!existsSync(new URL(`../${file}`, import.meta.url)))
    fail(`缺少构建产物: ${file}`)
}

let packInfo
try {
  const packArgs = [
    'pack',
    '--dry-run',
    '--json',
    '--ignore-scripts',
  ]
  // Windows 上 npm 是 .cmd，execFile 无法直接执行，需经 cmd.exe。
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
  fail(`npm pack --dry-run 失败: ${error.message}`)
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
  ]

  for (const file of required) {
    if (!files.has(file))
      fail(`tarball 缺少必需文件: ${file}`)
  }

  for (const file of files) {
    if (file.startsWith('src/') || file.startsWith('tests/') || file.startsWith('scripts/') || file.startsWith('docs/') || file.startsWith('examples/'))
      fail(`tarball 不应包含: ${file}`)
  }
}

if (failures.length > 0) {
  console.error('verify-package 失败:')
  for (const message of failures)
    console.error(`  - ${message}`)
  process.exit(1)
}

console.log(`verify-package 通过（${packInfo.files.length} 个文件）`)
