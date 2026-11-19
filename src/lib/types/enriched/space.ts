import type { TweetUser } from './user'

/** Space host, mapped from `AudioSpaceById.creator_results.result`. */
export interface SpaceHost extends Pick<TweetUser, 'verified' | 'verified_type' | 'is_blue_verified'> {
  id: string
  name: string
  screen_name: string
  profile_image_url_https: string
}

/** Raw `metadata.state`: `NotStarted` / `Running` / `Ended` / `TimedOut`. */
export type SpaceState = string

/**
 * Playback state derived from `state` + `is_space_available_for_replay`:
 * - `replayable`: ended and replay enabled
 * - `live`: still running
 * - `upcoming`: not started
 * - `no-replay`: ended without replay (no play affordance)
 * - `unavailable`: deleted / inaccessible (no metadata upstream)
 */
export type SpaceAvailability = 'replayable' | 'live' | 'upcoming' | 'no-replay' | 'unavailable'

export interface SpaceDetails {
  id: string
  url: string
  title: string
  state: SpaceState
  availability: SpaceAvailability
  createdAt: number
  startedAt: number | null
  endedAt: number | null
  durationMs: number | null
  listenersCount: number
  liveListenersCount: number
  replayCount: number
  isReplayAvailable: boolean
  host: SpaceHost
}
