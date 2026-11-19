/**
 * 校验发布 tag 与 package.json#version 一致。
 * 用法: node scripts/verify-release-tag.mjs v1.2.3
 */
import { readFileSync } from 'node:fs'

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME

if (!tag) {
  console.error('用法: node scripts/verify-release-tag.mjs <tag>')
  process.exit(1)
}

const expected = tag.replace(/^v/, '')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

if (pkg.version !== expected) {
  console.error(`tag 与版本不一致: tag=${expected} package.json=${pkg.version}`)
  process.exit(1)
}

console.log(`tag 与版本一致: ${pkg.version}`)
