/**
 * Documentation gate:
 * 1. Every local markdown link must point to a real file
 * 2. Every document under docs/ must be registered in the docs/README.md index
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const failures: string[] = []
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g

const UNREGISTERED_EXEMPT = new Set([
  'docs/README.md',
  'docs/postmortem/TEMPLATE.md',
])
const UNREGISTERED_PREFIXES = ['docs/development-log/']

function walk(dir: string): string[] {
  const files: string[] = []
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
        failures.push(`${relativeFile}: directory link is missing a README.md -> ${rawTarget}`)
      continue
    }

    if (existsSync(`${absolute}.md`))
      continue

    failures.push(`${relativeFile}: link points to a file that does not exist -> ${rawTarget}`)
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
    failures.push(`${relativeFile}: not registered in the docs/README.md index`)
}

if (failures.length > 0) {
  console.error('check-docs failed:')
  for (const failure of failures)
    console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(`check-docs passed (${markdownFiles.length} documents)`)
