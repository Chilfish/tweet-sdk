/**
 * Verify that the release tag matches package.json#version.
 * Usage: bun scripts/verify-release-tag.ts v1.2.3
 */
import { readFileSync } from 'node:fs'

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME

if (!tag) {
  console.error('Usage: bun scripts/verify-release-tag.ts <tag>')
  process.exit(1)
}

const expected = tag.replace(/^v/, '')
const pkg: { version: string } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

if (pkg.version !== expected) {
  console.error(`tag does not match version: tag=${expected} package.json=${pkg.version}`)
  process.exit(1)
}

console.log(`tag matches version: ${pkg.version}`)
