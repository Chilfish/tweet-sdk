import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
  name?: string
  sideEffects?: boolean
  files?: string[]
  engines?: Record<string, string>
  exports: Record<string, unknown>
}

const manifest: PackageManifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8'),
)

describe('package manifest', () => {
  it('is the scoped tweet package', () => {
    expect(manifest.name).toBe('@chilfish/tweet')
  })

  it('marks the package as side-effect free', () => {
    expect(manifest.sideEffects).toBe(false)
  })

  it('publishes only the build output and docs', () => {
    expect(manifest.files).toContain('dist')
  })

  it('declares the supported node range', () => {
    expect(manifest.engines?.node).toBe('>=20')
  })

  it('exposes typed ESM and CJS entry points', () => {
    expect(manifest.exports['.']).toEqual({
      import: { types: './dist/index.d.ts', default: './dist/index.js' },
      require: { types: './dist/index.d.cts', default: './dist/index.cjs' },
    })
  })

  it('exposes the node entry as a typed subpath', () => {
    expect(manifest.exports['./node']).toEqual({
      import: { types: './dist/node.d.ts', default: './dist/node.js' },
      require: { types: './dist/node.d.cts', default: './dist/node.cjs' },
    })
  })
})
