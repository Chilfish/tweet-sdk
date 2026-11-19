import type { HttpRequest } from '../http/types'

/**
 * Collection of requests related to Spaces.
 *
 * @public
 */
export class SpaceRequests {
  /**
   * @param id - The id of the Space whose details are to be fetched.
   *
   * @remarks
   * - `withReplays: true` is required to get metadata for finished sessions (`Ended` /
   *   `TimedOut`); without it X only returns sessions that are in progress.
   * - The response shape is `data.audioSpace.{ metadata, participants }`, and every field
   *   the card needs lives in `metadata` (title / state / started_at / ended_at /
   *   total_*_listeners / creator_results). The recording's m3u8 is not part of this
   *   response (it needs a further v1.1 `live_video_stream/status/{media_key}` call);
   *   in-app playback is out of scope for now, so we do not request it.
   */
  public static details(id: string): HttpRequest {
    return {
      method: 'get',
      url: 'https://x.com/i/api/graphql/HPEisOmj1epUNLCWTYhUWw/AudioSpaceById',
      params: {

        variables: JSON.stringify({
          id,
          isMetatagsQuery: true,
          withDownvotePerspective: false,
          withReactionsMetadata: false,
          withReactionsPerspective: false,
          withReplays: true,
          withSuperFollowsUserFields: true,
          withSuperFollowsTweetFields: true,
        }),
        features: JSON.stringify({
          dont_mention_me_view_api_enabled: true,
          interactive_text_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          responsive_web_enhance_cards_enabled: true,
          responsive_web_uc_gql_enabled: true,
          spaces_2022_h2_clipping: true,
          spaces_2022_h2_spaces_communities: false,
          standardized_nudges_misinfo: true,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
          vibe_api_enabled: true,
        }),

      },
    }
  }
}
