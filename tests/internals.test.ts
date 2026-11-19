import { describe, expect, it } from 'vitest'
import * as internals from '../src/internals'

describe('internals entry', () => {
  it('exposes the collections and descriptors needed by migrations', () => {
    expect(typeof internals.Extractors).toBe('object')
    expect(typeof internals.Requests).toBe('object')
    expect(typeof internals.TweetRequests.details).toBe('function')
    expect(typeof internals.SpaceRequests.details).toBe('function')
    expect(internals.FetchResourcesGroup.length).toBeGreaterThan(0)
    expect(internals.AllowGuestAuthenticationGroup.length).toBeGreaterThan(0)
    expect(typeof internals.findByFilter).toBe('function')
    expect(typeof internals.TweetFilter).toBe('function')
  })

  it('exposes the raw fetch composition layer', () => {
    expect(typeof internals.TwitterAPIClient).toBe('function')
  })
})
