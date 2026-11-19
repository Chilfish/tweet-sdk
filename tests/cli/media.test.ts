import type { EnrichedTweet } from '../../src/lib/types/enriched'
import { describe, expect, it } from 'vitest'
import { planMediaTargets } from '../../src/cli/commands/media'

function tweet(mediaDetails: NonNullable<EnrichedTweet['mediaDetails']>): EnrichedTweet {
  return {
    id: '1968314084207788302',
    url: 'https://twitter.com/demo/status/1968314084207788302',
    lang: 'en',
    created_at: 'Wed Sep 17 14:00:21 +0000 2025',
    text: 'hello',
    user: {
      id: '1',
      name: 'demo',
      screen_name: 'demo',
      verified: false,
      is_blue_verified: false,
      profile_image_url_https: '',
      profile_image_shape: 'Circle',
    },
    entities: [],
    mediaDetails,
  } as unknown as EnrichedTweet
}

describe('planMediaTargets', () => {
  it('maps photos to original-size urls with a stable filename', () => {
    const targets = planMediaTargets(tweet([
      {
        type: 'photo',
        index: 0,
        media_url_https: 'https://pbs.twimg.com/media/HPxZhM0aQAAZxz3?format=jpg&name=small',
        original_info: { width: 1200, height: 900 },
      },
    ]))

    expect(targets).toHaveLength(1)
    expect(targets[0]).toMatchObject({
      index: 0,
      type: 'photo',
      url: 'https://pbs.twimg.com/media/HPxZhM0aQAAZxz3.jpg?name=orig',
      filename: '1968314084207788302_0.jpg',
    })
  })

  it('picks the highest-bitrate mp4 for videos', () => {
    const targets = planMediaTargets(tweet([
      {
        type: 'video',
        index: 1,
        media_url_https: 'https://pbs.twimg.com/cover.jpg',
        original_info: { width: 720, height: 900 },
        video_info: {
          duration: 6006,
          aspect_ratio: [16, 9],
          variants: [
            { content_type: 'video/mp4', bitrate: 832000, url: 'https://video.twimg.com/low.mp4' },
            { content_type: 'video/mp4', bitrate: 2176000, url: 'https://video.twimg.com/high.mp4' },
            { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/playlist.m3u8' },
          ],
        },
      },
    ]))

    expect(targets[0]).toMatchObject({
      type: 'video',
      url: 'https://video.twimg.com/high.mp4',
      filename: '1968314084207788302_1.mp4',
    })
  })

  it('honours the photos / videos switches', () => {
    const media = [
      {
        type: 'photo' as const,
        index: 0,
        media_url_https: 'https://pbs.twimg.com/media/a.jpg',
        original_info: { width: 1, height: 1 },
      },
      {
        type: 'animated_gif' as const,
        index: 1,
        media_url_https: 'https://pbs.twimg.com/gif.jpg',
        original_info: { width: 1, height: 1 },
        video_info: {
          duration: 0,
          aspect_ratio: [1, 1] as [number, number],
          variants: [
            { content_type: 'video/mp4' as const, url: 'https://video.twimg.com/gif.mp4' },
          ],
        },
      },
    ]

    expect(planMediaTargets(tweet(media), { photos: false })).toHaveLength(1)
    expect(planMediaTargets(tweet(media), { videos: false })).toHaveLength(1)
    expect(planMediaTargets(tweet(media), { photos: false, videos: false })).toHaveLength(0)
  })

  it('returns an empty plan for tweets without media', () => {
    expect(planMediaTargets(tweet([]))).toEqual([])
  })
})
