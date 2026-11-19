/**
 * `@chilfish/tweet/internals` — **unstable** escape hatch.
 *
 * Exposes the raw response types, descriptor collections and extractors that
 * downstream migrations need for fixtures and parity tests. This surface has
 * no SemVer guarantees: it mirrors `src/lib/**` and may change in a minor
 * release. Application code should prefer `@chilfish/tweet`.
 */

export { Extractors } from './lib/collections/Extractors'
// COLLECTIONS + DESCRIPTORS
export { AllowGuestAuthenticationGroup, FetchResourcesGroup } from './lib/collections/Groups'
export { Requests } from './lib/collections/Requests'
// HELPERS + SERVICES
export { findByFilter } from './lib/helper/JsonUtils'
export { FetchArgs, TweetFilter } from './lib/models/args/FetchArgs'
export type { User as UserDetails } from './lib/models/data/User'
export { ListRequests } from './lib/requests/List'
export { MediaRequests } from './lib/requests/Media'
export { SpaceRequests } from './lib/requests/Space'
export { TweetRequests } from './lib/requests/Tweet'
export { UserRequests } from './lib/requests/User'
export { TwitterAPIClient } from './lib/services/public/TwitterAPIClient'
// MODELS
export type { IUser as UserData } from './lib/types/data/User'
// RAW TYPES
export type { IRawSpace } from './lib/types/raw/base/Space'

export type { IUser } from './lib/types/raw/base/User'
export type { IListTweetsResponse } from './lib/types/raw/list/Tweets'

export type { ISpaceDetailsResponse } from './lib/types/raw/space/Details'
export type {
  RawArticleBlock,
  RawArticleContentState,
  RawArticleEntityValue,
  RawArticleMedia,
  RawArticleResult,
} from './lib/types/raw/tweet/Details'
export type { ITweetDetailsResponse } from './lib/types/raw/tweet/Details'
export type { ITweetRepliesResponse } from './lib/types/raw/tweet/Replies'
export type { ITweetSearchResponse } from './lib/types/raw/tweet/Search'

export type { IUserDetailsResponse } from './lib/types/raw/user/Details'
export type { IUserTweetsResponse } from './lib/types/raw/user/Tweets'
