import type { EnrichedTweet, RawTweet } from '../../src/lib/types/enriched'
import type { IAudioSpace } from '../../src/lib/types/raw/space/Details'
import { describe, expect, it, vi } from 'vitest'
import { FetchResourcesGroup } from '../../src/lib/collections/Groups'
import { Requests } from '../../src/lib/collections/Requests'
import { ResourceType } from '../../src/lib/enums/Resource'
import {
  attachSpaceDetails,
  extractAudiospaceId,
  extractSpaceIdFromUrl,
  mapSpaceDetails,
  resolveSpaceId,
} from '../../src/lib/parse/space'
import { SpaceRequests } from '../../src/lib/requests/Space'
import { loadFixture } from '../helpers/load-fixture'

/**
 * Space card pure logic (no network, no React) + request layer wiring.
 *
 * All fixtures are frozen real upstream responses: the `card` (audiospace) of tweet
 * `1968314084207788302`, the `AudioSpaceById` response of Space `1yoKMPnjEbOxQ`, and the
 * response of the deleted Space `1DGLdvzVZmLGm` (only `is_subscribed`, no metadata).
 * Assertion values match the copy observed on the official card
 * ("2,478 listening/replay" / "Sep 17" / "42:40").
 */

const SPACE_ID = '1yoKMPnjEbOxQ'

const card = loadFixture<unknown>('space/audio-space-card.json')
const audioSpace = loadFixture<IAudioSpace>('space/audio-space-ended.json')
const unavailableSpace = loadFixture<IAudioSpace>('space/audio-space-unavailable.json')
const fixtureTweet = loadFixture<EnrichedTweet>('tweets/with-space-ja.json')

/**
 * Derive the space under test from the real metadata: override only the field under
 * examination and keep the rest of the real structure.
 */
function derived(over: Record<string, unknown>): Record<string, any> {
  return {
    metadata: {
      ...audioSpace.metadata,
      ...over,
    },
  }
}

function enriched(over: Partial<EnrichedTweet> = {}): EnrichedTweet {
  return {
    id: '1968314084207788302',
    url: 'https://twitter.com/BDP_yumemita/status/1968314084207788302',
    lang: 'zxx',
    created_at: 'Wed Sep 17 14:00:21 +0000 2025',
    text: 'https://t.co/gOS5Qc3DS4',
    user: fixtureTweet.user,
    entities: fixtureTweet.entities,
    ...over,
  } as EnrichedTweet
}

function rawTweet(cardData: unknown, restId = '1968314084207788302'): RawTweet {
  return { rest_id: restId, card: cardData, legacy: {} } as unknown as RawTweet
}

describe('audiospace card detection', () => {
  it('extracts the space id from the real audiospace card', () => {
    expect(extractAudiospaceId(card)).toBe(SPACE_ID)
  })

  it('returns null for anything that is not an audiospace card', () => {
    expect(extractAudiospaceId(undefined)).toBeNull()
    expect(extractAudiospaceId({})).toBeNull()
    expect(extractAudiospaceId({
      legacy: { name: 'summary_large_image', binding_values: [] },
    })).toBeNull()
    // The name looks like audiospace but there is no id binding / no binding_values
    expect(extractAudiospaceId({
      legacy: {
        name: '3691233323:audiospace',
        binding_values: [
          {
            key: 'card_url',
            value: { string_value: 'x' },
          },
        ],
      },
    })).toBeNull()
    expect(extractAudiospaceId({
      legacy: { name: '3691233323:audiospace' },
    })).toBeNull()
    // Also accepts a value that is already at the legacy level (no legacy wrapper)
    expect(extractAudiospaceId({
      name: '3691233323:audiospace',
      binding_values: [
        {
          key: 'id',
          value: { string_value: 'abc' },
        },
      ],
    })).toBe('abc')
  })
})

describe('audioSpaceById metadata mapping', () => {
  const space = mapSpaceDetails(SPACE_ID, audioSpace, fixtureTweet.user)

  it('maps the real metadata onto the card fields', () => {
    expect(space).not.toBeNull()

    expect(space!.id).toBe(SPACE_ID)
    expect(space!.url).toBe('https://x.com/i/spaces/1yoKMPnjEbOxQ')
    // The title contains CJK + emoji and is not truncated
    expect(space!.title).toBe('#ゆめみた合宿3日目！ついに最終日！✨コメントはハッシュタグにてお願いします✨')
    expect(space!.state).toBe('Ended')
    expect(space!.isReplayAvailable).toBe(true)
    expect(space!.availability).toBe('replayable')

    // The official card shows 42:40 = ended_at - started_at
    expect(space!.startedAt).toBe(1758117620659)
    expect(space!.endedAt).toBe(1758120181605)
    expect(space!.durationMs).toBe(2560946)

    // The official card's listener count = live listeners + replays
    expect(space!.liveListenersCount).toBe(1245)
    expect(space!.replayCount).toBe(1233)
    expect(space!.listenersCount).toBe(2478)

    expect(space!.host.name).toBe('夢限大みゅーたいぷ')
    expect(space!.host.screen_name).toBe('BDP_yumemita')
    expect(space!.host.id).toBe('1546362523561390081')
    expect(space!.host.profile_image_url_https).toContain('pbs.twimg.com/profile_images/')
  })

  it('fills verification from the tweet author when the host is the author', () => {
    // `creator_results` from AudioSpaceById is a slimmed-down object: no is_blue_verified / verified_type
    const creator = (audioSpace.metadata as any).creator_results.result
    expect(creator.is_blue_verified).toBeUndefined()
    expect(creator.legacy.verified_type).toBeUndefined()

    // The tweet author object is more complete, so it fills in the gaps for the same account;
    // otherwise the verified badge shown on the official card is lost
    expect(space!.host.is_blue_verified).toBe(true)
    expect(space!.host.verified_type).toBe('Business')

    // A different account (not the host) does not borrow the verification
    const other = mapSpaceDetails(SPACE_ID, audioSpace, {
      ...fixtureTweet.user,
      screen_name: 'someone_else',
      is_blue_verified: true,
      verified_type: 'Government',
    })
    expect(other!.host.is_blue_verified).toBe(false)
    expect(other!.host.verified_type).toBeUndefined()
  })
})

describe('malformed metadata degrades without throwing', () => {
  it('drops the card only when the space id itself is unknown', () => {
    // Without an id no URL can be built — the only case that returns null
    expect(mapSpaceDetails('', audioSpace)).toBeNull()
    expect(mapSpaceDetails('', undefined)).toBeNull()
  })

  it('degrades partial metadata instead of throwing', () => {
    // No title: still returned (with an empty title), not dropped as a whole
    const noTitle = mapSpaceDetails(SPACE_ID, derived({ title: '' }))
    expect(noTitle).not.toBeNull()
    expect(noTitle!.title).toBe('')
    expect(noTitle!.availability).toBe('replayable')

    // A running space (no ended_at) → no throw, duration is missing
    const live = mapSpaceDetails(SPACE_ID, derived({ state: 'Running', ended_at: undefined }))
    expect(live!.durationMs).toBeNull()
    expect(live!.state).toBe('Running')

    // Missing creator_results → host info is empty, but the title and listener count remain
    const noCreator = mapSpaceDetails(SPACE_ID, derived({ creator_results: undefined }))
    expect(noCreator!.title).toContain('ゆめみた合宿3日目')
    expect(noCreator!.host.screen_name).toBe('')
    expect(noCreator!.host.name).toBe('')
    expect(noCreator!.listenersCount).toBe(2478)

    // Listener counts missing → normalized to 0, no NaN
    const noCounts = mapSpaceDetails(SPACE_ID, derived({
      total_live_listeners: undefined,
      total_replay_watched: undefined,
    }))
    expect(noCounts!.listenersCount).toBe(0)

    // Invalid upstream timestamp → duration is missing, no throw
    expect(mapSpaceDetails(SPACE_ID, derived({ ended_at: 'not-a-number' }))!.durationMs).toBeNull()
  })
})

describe('request layer targets AudioSpaceById', () => {
  it('builds an AudioSpaceById request with replays enabled', () => {
    const config = SpaceRequests.details(SPACE_ID)

    expect(config.method).toBe('get')
    expect(config.url).toContain('/graphql/HPEisOmj1epUNLCWTYhUWw/AudioSpaceById')

    const variables = JSON.parse(String(config.params?.variables))
    expect(variables.id).toBe(SPACE_ID)
    expect(variables.withReplays).toBe(true)
  })

  it('the resource is registered for fetching (wiring guard)', () => {
    expect(ResourceType.SPACE_DETAILS).toBe('SPACE_DETAILS')
    // If the resource is not registered in FetchResourcesGroup, _validateArgs rejects it as
    // invalid and the request fails silently
    expect(FetchResourcesGroup).toContain(ResourceType.SPACE_DETAILS)
    expect(Requests[ResourceType.SPACE_DETAILS]({ id: SPACE_ID }).url).toContain('AudioSpaceById')
  })
})

describe('deleted / inaccessible space becomes a tombstone', () => {
  it('maps a metadata-less response to the unavailable state', () => {
    expect(unavailableSpace.metadata).toBeUndefined()

    const space = mapSpaceDetails('1DGLdvzVZmLGm', unavailableSpace)

    expect(space).not.toBeNull()
    expect(space!.availability).toBe('unavailable')
    expect(space!.id).toBe('1DGLdvzVZmLGm')
    // A tombstone still needs a navigable URL (built from the card binding id, independent of metadata)
    expect(space!.url).toBe('https://x.com/i/spaces/1DGLdvzVZmLGm')
    expect(space!.title).toBe('')
    expect(space!.listenersCount).toBe(0)
    expect(space!.durationMs).toBeNull()
    expect(space!.isReplayAvailable).toBe(false)
    expect(space!.host.name).toBe('')
    expect(space!.host.screen_name).toBe('')
  })

  it('treats a missing audioSpace node the same way', () => {
    expect(mapSpaceDetails('1DGLdvzVZmLGm', null)!.availability).toBe('unavailable')
    expect(mapSpaceDetails('1DGLdvzVZmLGm', undefined)!.availability).toBe('unavailable')
    expect(mapSpaceDetails('1DGLdvzVZmLGm', {})!.availability).toBe('unavailable')
  })

  // Regression: Space tweets without a card used to be dropped entirely — only the card
  // binding id was recognised as a space reference
  it('resolves the space id from the body link when there is no card', () => {
    const cardless = loadFixture<{
      card: unknown
      entities: Array<{ expanded_url: string, href?: string }>
    }>('space/audio-space-cardless-tweet.json')

    expect(cardless.card).toBeNull()
    // An id only exists through the card, so it is empty here
    expect(extractAudiospaceId(cardless.card)).toBeNull()

    const entities = cardless.entities.map(e => ({ ...e, href: e.expanded_url }))
    expect(resolveSpaceId(cardless.card, entities)).toBe('1djGXroNWDExZ')

    // The card takes precedence over the body link
    expect(resolveSpaceId(card, entities)).toBe(SPACE_ID)

    // Neither a card nor a Space link → null
    expect(resolveSpaceId(null, [
      { href: 'https://example.com/a' },
    ])).toBeNull()
    expect(resolveSpaceId(null, [])).toBeNull()
    expect(resolveSpaceId(undefined, undefined)).toBeNull()

    // That space is deleted as well → tombstone state
    const space = mapSpaceDetails('1djGXroNWDExZ', unavailableSpace)
    expect(space!.availability).toBe('unavailable')
    expect(space!.url).toBe('https://x.com/i/spaces/1djGXroNWDExZ')
  })

  it('extracts the space id from a space url', () => {
    expect(extractSpaceIdFromUrl('https://x.com/i/spaces/1djGXroNWDExZ')).toBe('1djGXroNWDExZ')
    expect(extractSpaceIdFromUrl('https://twitter.com/i/spaces/1yoKMPnjEbOxQ?foo=1')).toBe('1yoKMPnjEbOxQ')
    expect(extractSpaceIdFromUrl('https://x.com/BDP_yumemita')).toBeNull()
    expect(extractSpaceIdFromUrl('https://t.co/ELCNFX5yGy')).toBeNull()
    expect(extractSpaceIdFromUrl(undefined)).toBeNull()
  })
})

describe('availability drives whether playback is offered', () => {
  it('only an ended space with replay enabled is replayable', () => {
    expect(mapSpaceDetails(SPACE_ID, audioSpace)!.availability).toBe('replayable')
    // Ended, but the host did not enable replay — there is no recording to play, so no
    // playback entry point may be offered
    expect(mapSpaceDetails(SPACE_ID, derived({ is_space_available_for_replay: false }))!.availability)
      .toBe('no-replay')
    expect(mapSpaceDetails(SPACE_ID, derived({ state: 'TimedOut', is_space_available_for_replay: false }))!.availability)
      .toBe('no-replay')
  })

  it('classifies live and upcoming spaces', () => {
    expect(mapSpaceDetails(SPACE_ID, derived({ state: 'Running' }))!.availability).toBe('live')
    expect(mapSpaceDetails(SPACE_ID, derived({ state: 'NotStarted' }))!.availability).toBe('upcoming')
    // Case-insensitive (upstream casing of `state` is not guaranteed)
    expect(mapSpaceDetails(SPACE_ID, derived({ state: 'running' }))!.availability).toBe('live')
  })

  it('replay-disabled space still shows its metadata', () => {
    const noReplay = mapSpaceDetails(SPACE_ID, derived({ is_space_available_for_replay: false }))!
    // Replay being off only means "cannot play"; the metadata is still shown, just like the
    // official card which keeps listing the listener count and duration
    expect(noReplay.title).toContain('ゆめみた合宿3日目')
    expect(noReplay.listenersCount).toBe(2478)
    expect(noReplay.durationMs).toBe(2560946)
    expect(noReplay.host.name).toBe('夢限大みゅーたいぷ')
  })
})

describe('attachSpaceDetails wires space onto enriched tweets', () => {
  it('resolves the space from the card binding and attaches the mapped details', async () => {
    const tweets = [
      enriched(),
    ]
    const fetchSpace = vi.fn().mockResolvedValue(audioSpace)

    await attachSpaceDetails(tweets, [
      rawTweet(card),
    ], fetchSpace)

    expect(fetchSpace).toHaveBeenCalledWith(SPACE_ID)
    expect(tweets[0]!.space).toMatchObject({ id: SPACE_ID, availability: 'replayable', listenersCount: 2478 })
  })

  it('falls back to the body link when the tweet has no card', async () => {
    const tweets = [
      enriched(),
    ]
    const fetchSpace = vi.fn().mockResolvedValue(unavailableSpace)

    await attachSpaceDetails(tweets, [
      rawTweet(null),
    ], fetchSpace)

    expect(fetchSpace).toHaveBeenCalledWith(SPACE_ID)
    expect(tweets[0]!.space).toMatchObject({ id: SPACE_ID, availability: 'unavailable' })
  })

  it('de-duplicates upstream calls per space id within a batch', async () => {
    const tweets = [
      enriched({ id: '1' }),
      enriched({ id: '2' }),
    ]
    const fetchSpace = vi.fn().mockResolvedValue(audioSpace)

    await attachSpaceDetails(tweets, [
      rawTweet(null),
      rawTweet(null),
    ], fetchSpace)

    // Both tweets point at the same Space → the upstream is hit only once
    expect(fetchSpace).toHaveBeenCalledTimes(1)
    expect(fetchSpace).toHaveBeenCalledWith(SPACE_ID)
    expect(tweets[0]!.space).toMatchObject({ id: SPACE_ID })
    expect(tweets[1]!.space).toMatchObject({ id: SPACE_ID })
  })

  it('does not fabricate a tombstone when the upstream call fails', async () => {
    const tweets = [
      enriched(),
    ]
    const fetchSpace = vi.fn().mockRejectedValue(new Error('429 Too Many Requests'))

    await expect(attachSpaceDetails(tweets, [
      rawTweet(card),
    ], fetchSpace)).resolves.toBeUndefined()

    expect(tweets[0]!.space).toBeUndefined()
  })

  it('leaves tweets without any space reference untouched', async () => {
    const tweets = [
      enriched({
        entities: [
          { type: 'text', index: 0, text: 'hello' },
        ],
      }),
    ]
    const fetchSpace = vi.fn()

    await attachSpaceDetails(tweets, [
      rawTweet(null),
    ], fetchSpace)

    expect(fetchSpace).not.toHaveBeenCalled()
    expect(tweets[0]!.space).toBeUndefined()
  })
})
