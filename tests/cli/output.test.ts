import { describe, expect, it } from 'vitest'
import { parseOutputFormat, renderOutput } from '../../src/cli/output'
import { parseNonNegativeInt, parsePositiveInt } from '../../src/cli/parseArgs'

describe('parsePositiveInt', () => {
  it('accepts positive integers', () => {
    expect(parsePositiveInt('3')).toBe(3)
    expect(parsePositiveInt(' 20 ')).toBe(20)
    expect(parsePositiveInt(5)).toBeUndefined()
  })

  it('rejects empty, non-numeric and non-positive values', () => {
    expect(parsePositiveInt('')).toBeUndefined()
    expect(parsePositiveInt('abc')).toBeUndefined()
    expect(parsePositiveInt('0')).toBeUndefined()
    expect(parsePositiveInt('-1')).toBeUndefined()
  })
})

describe('parseNonNegativeInt', () => {
  it('accepts zero and positive integers', () => {
    expect(parseNonNegativeInt('0')).toBe(0)
    expect(parseNonNegativeInt('2')).toBe(2)
  })

  it('rejects negatives and non-numeric values', () => {
    expect(parseNonNegativeInt('-1')).toBeUndefined()
    expect(parseNonNegativeInt('x')).toBeUndefined()
  })
})

describe('parseOutputFormat', () => {
  it('defaults to json', () => {
    expect(parseOutputFormat(undefined)).toBe('json')
    expect(parseOutputFormat('')).toBe('json')
  })

  it('accepts markdown aliases', () => {
    expect(parseOutputFormat('markdown')).toBe('markdown')
    expect(parseOutputFormat(' MD ')).toBe('markdown')
  })

  it('rejects unknown formats', () => {
    expect(() => parseOutputFormat('yaml')).toThrow('Unknown output format')
  })
})

describe('renderOutput', () => {
  it('pretty-prints json with two spaces', () => {
    expect(renderOutput({ a: 1 }, 'json', {
      markdown: () => 'x',
    })).toBe('{\n  "a": 1\n}')
  })

  it('delegates to the markdown renderer', () => {
    expect(renderOutput({ a: 1 }, 'markdown', {
      markdown: value => `v=${value.a}`,
    })).toBe('v=1')
  })
})
