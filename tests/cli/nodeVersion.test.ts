import { describe, expect, it } from 'vitest'
import { isSupportedNodeVersion, MIN_NODE_VERSION, nodeVersionError } from '../../src/cli/nodeVersion'
import { displayWidth } from '../../src/cli/usage'

describe('node version guard', () => {
  it('accepts the engine floor and newer majors', () => {
    const [major, minor] = MIN_NODE_VERSION
    expect(isSupportedNodeVersion(`${major}.${minor}.0`)).toBe(true)
    expect(isSupportedNodeVersion(`${major + 2}.0.0`)).toBe(true)
  })

  it('rejects older majors and minors', () => {
    const [major, minor] = MIN_NODE_VERSION
    expect(isSupportedNodeVersion(`${major - 1}.99.0`)).toBe(false)
    expect(isSupportedNodeVersion(`${major}.${minor - 1}.0`)).toBe(false)
  })

  it('explains the requirement in the error message', () => {
    const message = nodeVersionError('18.0.0')
    expect(message).toContain('tweet-cli requires Node >=')
    expect(message).toContain('18.0.0')
  })
})

describe('displayWidth', () => {
  it('counts CJK characters as two columns', () => {
    expect(displayWidth('abc')).toBe(3)
    expect(displayWidth('推文')).toBe(4)
    expect(displayWidth('推文 id')).toBe(7)
  })

  it('ignores ANSI escapes and zero-width characters', () => {
    expect(displayWidth('\u001B[36mabc\u001B[39m')).toBe(3)
    expect(displayWidth('e\u0301')).toBe(1)
  })
})
