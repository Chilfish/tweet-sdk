import type { EnrichedTweet, RawTweet, SpaceAvailability, SpaceDetails, SpaceHost, TweetUser } from '../types/enriched'
import type { Logger } from '../types/Logger'
import type { IAudioSpace, ISpaceDetailsResponse } from '../types/raw/space/Details'
import { formatDate } from './date'

/**
 * Pure logic for Space (live audio / recording replay) cards.
 *
 * The two upstream data sources differ in origin and shape, so this module only does
 * "pure mapping" and no IO at all:
 * - **Card detection**: `extractAudiospaceId()` reads the tweet's own
 *   `card.name = '…:audiospace'` (its `binding_values` only holds `tweet_id` / `id` /
 *   `card_url` etc., with no title/image, so it is dropped by the final check in
 *   `mapTwitterCard` — which is exactly why Space cards used to never show up at all).
 * - **Metadata**: `mapSpaceDetails()` maps `AudioSpaceById`'s `audioSpace.metadata`
 *   into {@link SpaceDetails} (title/state/start and end time/listener count/host).
 *
 * All field semantics match the values observed on the official card (sample: Space
 * `1yoKMPnjEbOxQ`, Ended + replayable).
 * Sunk into pure functions to make it unit-testable (Postmortem #002: pure logic must be
 * verifiable without React).
 */

/** The official Space card name looks like `3691233323:audiospace` (the prefix is the card template number and changes between versions) */
const AUDIOSPACE_CARD_SUFFIX = 'audiospace'

/** Space link in the body (`x.com/i/spaces/<id>` / `twitter.com/i/spaces/<id>`) */
const SPACE_URL_RE = /^https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/i\/spaces\/([0-9A-Za-z]+)/

/**
 * Extracts the Space id from the tweet's raw `card`.
 *
 * @param cardData - the `card` node from the raw `TweetResultByRestId` response
 * @returns the Space id; null when the card is not an audiospace card or has no `id` binding
 */
export function extractAudiospaceId(cardData: unknown): string | null {
  const legacy = (cardData as { legacy?: unknown })?.legacy ?? cardData
  const name = (legacy as { name?: unknown })?.name
  const bindingValues = (legacy as { binding_values?: unknown })?.binding_values

  if (typeof name !== 'string' || !name.endsWith(AUDIOSPACE_CARD_SUFFIX) || !Array.isArray(bindingValues))
    return null

  const id = bindingValues
    .find((v: any) => v?.key === 'id')
    ?.value
    ?.string_value

  return typeof id === 'string' && id
    ? id
    : null
}

/** Whether this URL points at an X Space page (the body uses this to avoid showing the same jump target twice alongside the card) */
export function isSpaceUrl(url?: string | null): boolean {
  return typeof url === 'string' && SPACE_URL_RE.test(url)
}

/** Extracts the Space id from a Space link; returns null when it is not a Space link */
export function extractSpaceIdFromUrl(url?: string | null): string | null {
  if (typeof url !== 'string')
    return null
  return SPACE_URL_RE.exec(url)?.[1] ?? null
}

/**
 * Resolves the Space id for a tweet, **preferring the card and falling back to a body link**.
 *
 * Both kinds of tweet must be recognized:
 * - one carrying a `…:audiospace` card (the common shape; the id is in a binding)
 * - one **without a card** that only pastes an `x.com/i/spaces/…` link in the body
 *   (observed sample: tweet `1871586443388420240` has no card at all, only a url entity)
 *   — these used to be missed entirely
 */
export function resolveSpaceId(
  cardData: unknown,
  entities?: ReadonlyArray<unknown> | null,
): string | null {
  const fromCard = extractAudiospaceId(cardData)
  if (fromCard)
    return fromCard

  // Entities are a union type (text/hashtag/… mostly have no href), so take them in as unknown and narrow afterwards
  for (const entity of entities ?? []) {
    const id = extractSpaceIdFromUrl((entity as { href?: string } | null | undefined)?.href)
    if (id)
      return id
  }

  return null
}

/** Upstream timestamps mix seconds and milliseconds, so `< 1e12` is treated as seconds; empty/invalid values become null */
function toMillis(value: unknown): number | null {
  if (value === null || value === undefined || value === '')
    return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0)
    return null
  return n < 1e12
    ? Math.round(n * 1000)
    : n
}

function asRecord(value: unknown): Record<string, any> | undefined {
  return value && typeof value === 'object'
    ? value as Record<string, any>
    : undefined
}

/**
 * Derives the card's playable state from `state` + `is_space_available_for_replay`.
 *
 * The key branch is "ended but replay not enabled": there is **no** recording to play
 * then, so we must never offer a playback entry point (the official card does not either).
 */
function resolveAvailability(state: string, isReplayAvailable: boolean): SpaceAvailability {
  const normalized = state.toLowerCase()
  if (normalized === 'running')
    return 'live'
  if (normalized === 'notstarted')
    return 'upcoming'
  // Ended / TimedOut / unknown are all treated as "ended"; playability is decided by the replay flag
  return isReplayAvailable ? 'replayable' : 'no-replay'
}

const EMPTY_HOST: SpaceHost = {
  id: '',
  name: '',
  screen_name: '',
  profile_image_url_https: '',
  verified: false,
  is_blue_verified: false,
}

/**
 * Maps the `data.audioSpace` node of `AudioSpaceById` into the {@link SpaceDetails} the card needs.
 *
 * @param spaceId - the Space id from the card binding (a tombstone state also needs it to build the URL, so it must be available before the metadata)
 * @param audioSpace - the GraphQL `data.audioSpace` node
 * @param tweetAuthor - the tweet author (optional). When the author is the host, use the
 *   fuller user object from the tweet side to fill in verification info and the avatar —
 *   `creator_results` in `AudioSpaceById` is a slim object missing `is_blue_verified` /
 *   `verified_type`, so rendering from it alone loses the verification badge shown on the
 *   official card.
 * @returns null when `spaceId` is empty; **an `unavailable` tombstone when upstream has no
 *   metadata** — a deleted / inaccessible Space still needs a UI hint instead of silently
 *   showing nothing (observed: the response for such ids is `{ is_subscribed: false }` with
 *   no metadata)
 */
export function mapSpaceDetails(
  spaceId: string,
  audioSpace?: IAudioSpace | Record<string, any> | null,
  tweetAuthor?: TweetUser | null,
): SpaceDetails | null {
  if (!spaceId)
    return null

  const url = `https://x.com/i/spaces/${spaceId}`
  const metadata = asRecord(asRecord(audioSpace)?.metadata) as ISpaceDetailsResponse | undefined

  if (!metadata) {
    return {
      id: spaceId,
      url,
      title: '',
      state: '',
      availability: 'unavailable',
      createdAt: 0,
      startedAt: null,
      endedAt: null,
      durationMs: null,
      listenersCount: 0,
      liveListenersCount: 0,
      replayCount: 0,
      isReplayAvailable: false,
      host: { ...EMPTY_HOST },
    }
  }

  const title = typeof metadata.title === 'string'
    ? metadata.title.trim()
    : ''

  const creator = asRecord(asRecord(metadata.creator_results)?.result)
  const creatorLegacy = asRecord(creator?.legacy)

  const host: SpaceHost = {
    id: typeof creator?.rest_id === 'string'
      ? creator.rest_id
      : '',
    name: typeof creatorLegacy?.name === 'string'
      ? creatorLegacy.name
      : '',
    screen_name: typeof creatorLegacy?.screen_name === 'string'
      ? creatorLegacy.screen_name
      : '',
    profile_image_url_https: typeof creatorLegacy?.profile_image_url_https === 'string'
      ? creatorLegacy.profile_image_url_https
      : '',
    verified: creatorLegacy?.verified === true,
    is_blue_verified: creator?.is_blue_verified === true,
    verified_type: creatorLegacy?.verified_type,
  }

  if (tweetAuthor?.screen_name && tweetAuthor.screen_name === host.screen_name) {
    // Upstream omits the `verified` field (it only appears when actually true), so always narrow with `=== true`
    host.verified = host.verified || tweetAuthor.verified === true
    host.is_blue_verified = host.is_blue_verified || tweetAuthor.is_blue_verified === true
    host.verified_type ??= tweetAuthor.verified_type
    host.profile_image_url_https ||= tweetAuthor.profile_image_url_https
  }

  const startedAt = toMillis(metadata.started_at)
  const endedAt = toMillis(metadata.ended_at)
  const liveListenersCount = Number(metadata.total_live_listeners) || 0
  const replayCount = Number(metadata.total_replay_watched) || 0
  const isReplayAvailable = metadata.is_space_available_for_replay === true
  const state = typeof metadata.state === 'string'
    ? metadata.state
    : ''

  return {
    id: spaceId,
    url,
    title,
    state,
    availability: resolveAvailability(state, isReplayAvailable),
    createdAt: toMillis(metadata.created_at) ?? 0,
    startedAt,
    endedAt,
    durationMs: startedAt !== null && endedAt !== null && endedAt > startedAt
      ? endedAt - startedAt
      : null,
    listenersCount: liveListenersCount + replayCount,
    liveListenersCount,
    replayCount,
    isReplayAvailable,
    host,
  }
}

/** Session duration → official format `42:40` (`1:02:03` for ≥1 hour); returns an empty string for an invalid duration */
export function formatSpaceDuration(ms?: number | null): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms <= 0)
    return ''

  const totalSeconds = Math.floor(ms / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  const pad = (n: number): string => n.toString().padStart(2, '0')

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Session date → `Sep 17` (English month name, no leading zero on the day) */
export function formatSpaceDate(ms?: number | null): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms <= 0)
    return ''

  const [month, day] = formatDate(ms, 'MM-dd').split('-')
  if (!month || !day)
    return ''

  const monthName = MONTH_NAMES[Number(month) - 1]
  return monthName
    ? `${monthName} ${Number(day)}`
    : `${month}-${day}`
}

/** Listener/replay count → thousands-separated `2,478` */
export function formatSpaceListeners(count: number): string {
  if (!Number.isFinite(count) || count <= 0)
    return '0'
  return count.toLocaleString('en-US')
}

/** Playable states other than the tombstone (the card action area only picks among these four) */
export type SpacePlaybackState = Exclude<SpaceAvailability, 'unavailable'>

const SPACE_PLAYBACK_STATES: Record<SpacePlaybackState, true> = {
  'replayable': true,
  'live': true,
  'upcoming': true,
  'no-replay': true,
}

/**
 * Resolves the card action area's state, **staying compatible with old caches**.
 *
 * `availability` is a later addition: `space` objects persisted before that change
 * (memory LRU / local files / DB jsonContent) do not have it, and a direct table lookup
 * would yield `undefined` and crash at render time (observed in dev). So derive it from
 * the earlier `isReplayAvailable` as a fallback; if that is missing too, conservatively
 * use `no-replay` — better not to say "playable" than to promise something that cannot play.
 */
export function resolveSpacePlaybackState(
  space: Pick<SpaceDetails, 'availability' | 'isReplayAvailable'>,
): SpacePlaybackState {
  const { availability } = space
  if (availability && availability !== 'unavailable' && availability in SPACE_PLAYBACK_STATES)
    return availability

  return space.isReplayAvailable ? 'replayable' : 'no-replay'
}

/** Retweet-aware card source: only the original tweet carries the card. */
function unwrapCardSource(rawTweet: RawTweet): RawTweet {
  const base = ('tweet' in rawTweet
    ? (rawTweet as { tweet?: RawTweet }).tweet
    : rawTweet) as RawTweet
  return base?.legacy?.retweeted_status_result?.result ?? base
}

/**
 * Attaches `space` data to enriched tweets, using an injected fetcher so this
 * module stays IO-free and testable.
 *
 * - metadata found → normal card (`availability` distinguishes the states)
 * - no metadata upstream → `unavailable` tombstone
 * - request failed (429 / network) → no `space` attached at all, so the body
 *   link still renders and a rate limit is not misreported as "deleted"
 */
export async function attachSpaceDetails(
  enrichedTweets: EnrichedTweet[],
  rawTweets: RawTweet[],
  fetchSpace: (spaceId: string) => Promise<IAudioSpace | null>,
  logger?: Logger,
): Promise<void> {
  if (enrichedTweets.length === 0 || rawTweets.length === 0)
    return

  const rawById = new Map<string, RawTweet>()
  for (const raw of rawTweets) {
    const id = unwrapCardSource(raw)?.rest_id
    if (id)
      rawById.set(id, raw)
  }

  const cache = new Map<string, IAudioSpace | null>()

  for (const tweet of enrichedTweets) {
    const raw = rawById.get(tweet.id)
    const spaceId = resolveSpaceId(raw
      ? unwrapCardSource(raw)?.card
      : null, tweet.entities)
    if (!spaceId)
      continue

    try {
      if (!cache.has(spaceId))
        cache.set(spaceId, await fetchSpace(spaceId))

      const space = mapSpaceDetails(spaceId, cache.get(spaceId), tweet.user)
      if (space)
        tweet.space = space
    }
    catch (error) {
      logger?.warn?.('space.fetch.failed', {
        spaceId,
        tweetId: tweet.id,
        reason: error instanceof Error
          ? error.message
          : String(error),
      })
    }
  }
}
