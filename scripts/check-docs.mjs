/**
 * 文档门禁：
 * 1. 所有本地 markdown 链接必须指向真实文件
 * 2. docs/ 下的文档必须在 docs/README.md 索引中登记
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const failures = []
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g

const UNREGISTERED_EXEMPT = new Set([
  'docs/README.md',
  'docs/postmortem/TEMPLATE.md',
])
const UNREGISTERED_PREFIXES = ['docs/development-log/']

function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage')
      continue
    const full = join(dir, entry.name)
    if (entry.isDirectory())
      files.push(...walk(full))
    else if (entry.name.endsWith('.md'))
      files.push(full)
  }
  return files
}

const markdownFiles = walk(root)

for (const file of markdownFiles) {
  const relativeFile = relative(root, file).replaceAll('\\', '/')
  const content = readFileSync(file, 'utf-8')
  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].trim()
    if (/^(?:[a-z]+:|#)/i.test(rawTarget))
      continue

    const target = rawTarget.split('#')[0].split('?')[0]
    if (!target)
      continue

    const absolute = resolve(dirname(file), target)
    if (existsSync(absolute)) {
      if (statSync(absolute).isDirectory() && !existsSync(join(absolute, 'README.md')))
        failures.push(`${relativeFile}: 目录链接缺少 README.md -> ${rawTarget}`)
      continue
    }

    if (existsSync(`${absolute}.md`))
      continue

    failures.push(`${relativeFile}: 链接指向不存在的文件 -> ${rawTarget}`)
  }
}

const indexContent = readFileSync(join(root, 'docs/README.md'), 'utf-8')

for (const file of markdownFiles) {
  const relativeFile = relative(root, file).replaceAll('\\', '/')
  if (!relativeFile.startsWith('docs/'))
    continue
  if (UNREGISTERED_EXEMPT.has(relativeFile))
    continue
  if (UNREGISTERED_PREFIXES.some(prefix => relativeFile.startsWith(prefix)))
    continue

  const name = relativeFile.slice('docs/'.length)
  if (!indexContent.includes(name))
    failures.push(`${relativeFile}: 未在 docs/README.md 索引中登记`)
}

if (failures.length > 0) {
  console.error('check-docs 失败:')
  for (const failure of failures)
    console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(`check-docs 通过（${markdownFiles.length} 个文档）`)
