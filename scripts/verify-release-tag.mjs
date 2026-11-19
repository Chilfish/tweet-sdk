/**
 * Verify that the release tag matches package.json#version.
 * Usage: node scripts/verify-release-tag.mjs v1.2.3
 */
import { readFileSync } from 'node:fs'

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME

if (!tag) {
  console.error('Usage: node scripts/verify-release-tag.mjs <tag>')
  process.exit(1)
}

const expected = tag.replace(/^v/, '')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

if (pkg.version !== expected) {
  console.error(`tag does not match version: tag=${expected} package.json=${pkg.version}`)
  process.exit(1)
}

console.log(`tag matches version: ${pkg.version}`)
