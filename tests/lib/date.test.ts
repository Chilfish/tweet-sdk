import { describe, expect, it } from 'vitest'
import { formatDate } from '../../src/lib/parse/date'
import { formatSpaceDate } from '../../src/lib/parse/space'

describe('formatDate', () => {
  it('formats with the default pattern in the given time zone', () => {
    expect(formatDate('2024-01-02T03:04:05Z', undefined, 'UTC')).toBe('2024-01-02 03:04:05')
  })

  it('supports a custom pattern', () => {
    expect(formatDate('2024-01-02T03:04:05Z', 'yyyy/MM/dd', 'UTC')).toBe('2024/01/02')
    expect(formatDate('2024-01-02T03:04:05Z', 'HH:mm', 'UTC')).toBe('03:04')
  })

  it('treats small numbers as epoch seconds', () => {
    expect(formatDate(1_704_168_245, 'yyyy-MM-dd', 'UTC')).toBe('2024-01-02')
  })

  it('returns an empty string for invalid input', () => {
    expect(formatDate('not-a-date')).toBe('')
    expect(formatDate(Number.NaN)).toBe('')
  })
})

describe('formatSpaceDate', () => {
  it('renders an English month name without a leading zero', () => {
    const localNoon = new Date(2024, 8, 17, 12, 0, 0).getTime()
    expect(formatSpaceDate(localNoon)).toBe('Sep 17')
  })

  it('returns an empty string for invalid input', () => {
    expect(formatSpaceDate(0)).toBe('')
    expect(formatSpaceDate(null)).toBe('')
    expect(formatSpaceDate(Number.NaN)).toBe('')
  })
})
