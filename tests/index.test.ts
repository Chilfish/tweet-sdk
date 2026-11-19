import { describe, expect, it } from 'vitest'
import { one, two } from '../src/index'

describe('public api', () => {
  it('exposes numeric placeholders', () => {
    expect(one).toBe(1)
    expect(two).toBe(2)
  })
})
