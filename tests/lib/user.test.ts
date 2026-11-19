import type { IUser as IRawUser } from '../../src/lib/types/raw/base/User'
import { describe, expect, it } from 'vitest'
import { User } from '../../src/lib/models/data/User'

function rawUser(overrides: Partial<IRawUser> = {}): IRawUser {
  return {
    rest_id: '42',
    is_blue_verified: false,
    legacy: {
      description: '',
      followed_by: false,
      following: false,
      created_at: 'Mon Jan 01 00:00:00 +0000 2024',
      name: 'Test User',
      screen_name: 'tester',
      favourites_count: 0,
      followers_count: 0,
      friends_count: 0,
      statuses_count: 0,
      location: '',
      pinned_tweet_ids_str: [],
      profile_banner_url: '',
      profile_image_url_https: 'https://pbs.twimg.com/profile_images/1/legacy_normal.jpg',
    },
    core: {
      created_at: 'Mon Jan 01 00:00:00 +0000 2024',
      name: 'Test User',
      screen_name: 'tester',
    },
    avatar: {
      image_url: 'https://pbs.twimg.com/profile_images/1/avatar_normal.jpg',
    },
    ...overrides,
  } as unknown as IRawUser
}

describe('user model', () => {
  it('normalizes the avatar size suffix from the profile image node', () => {
    const user = new User(rawUser())
    expect(user.profileImage).toBe('https://pbs.twimg.com/profile_images/1/avatar.jpg')
    expect(user.toJSON().profileImage).toBe('https://pbs.twimg.com/profile_images/1/avatar.jpg')
  })

  it('falls back to the legacy avatar and still normalizes it', () => {
    const user = new User(rawUser({ avatar: undefined }))
    expect(user.profileImage).toBe('https://pbs.twimg.com/profile_images/1/legacy.jpg')
  })

  it('leaves non-twimg avatars untouched', () => {
    const user = new User(rawUser({
      avatar: { image_url: 'https://cdn.example.com/avatar_normal.jpg' },
    }))
    expect(user.profileImage).toBe('https://cdn.example.com/avatar_normal.jpg')
  })
})
