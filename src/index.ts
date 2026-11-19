/**
 * `@chilfish/tweet` — core entry (platform-neutral).
 *
 * X data extraction + parsing/enrichment. No `node:*` imports here; the
 * `./node` entry adds proxy/filesystem adapters and `./react` adds components.
 */

// CLIENT + POOL
export type { CreateClientOptions, CursoredTweets, ReplyOptions, SearchOptions, TwitterClientOptions } from './lib/client'
export { createClient, parseSearchTimeline, TwitterClient } from './lib/client'
// ENUMS
export { BaseType } from './lib/enums/Data'
export { ResourceType } from './lib/enums/Resource'

export { TweetRepliesSortType } from './lib/enums/Tweet'
// ERRORS
export type { TwitterApiErrorOptions } from './lib/errors'

export {
  AuthError,
  NotFoundError,
  NotSupportedError,
  PoolExhaustedError,
  RateLimitError,
  TwitterApiError,
} from './lib/errors'
// HTTP
export type { HttpClient, HttpRequest, HttpResponse } from './lib/http'

export { createFetchHttpClient, defaultHttpClient } from './lib/http'
// MEDIA URL
export { normalizeMediaUrl, normalizeProfileImageUrl } from './lib/media-url'
// CONFIG + TRANSPORT
export { DefaultRettiwtHeaders, RettiwtConfig } from './lib/models/RettiwtConfig'
// PARSE + ENRICH
export {
  applyAITranslations,
  attachSpaceDetails,
  collectEmbeddedTweetIds,
  derivePlainText,
  enrichTweet,
  extractArticleIdFromUrl,
  extractAudiospaceId,
  extractSpaceIdFromUrl,
  formatDate,
  formatSpaceDate,
  formatSpaceDuration,
  formatSpaceListeners,
  getEntities,
  getMediaAltEntities,
  isArticleUrl,
  isSpaceUrl,
  mapArticle,
  mapMediaDetails,
  mapPollCard,
  mapSpaceDetails,
  mapTwitterCard,
  mediaFromRaw,
  normalizeEntityMap,
  organizeTweets,
  parseContentState,
  parseTrendingCard,
  resolveArticleId,
  resolveArticleLink,
  resolveSpaceId,
  resolveSpacePlaybackState,
  restoreEntities,
  serializeForAI,
} from './lib/parse'
export type { OrganizedTweets, ParseLogger, TranslationPayload } from './lib/parse'
export type {
  PoolKeyStatus,
  RetryClassifier,
  RetryDecision,
  RettiwtPoolLogger,
  RettiwtPoolOptions,
} from './lib/pool'
export { RettiwtPool } from './lib/pool'
export { FetcherService } from './lib/services/public/FetcherService'

export { TweetEnrichmentService } from './lib/services/public/TweetEnrichmentService'
export { TwitterAPIClient } from './lib/services/public/TwitterAPIClient'
export { buildXShellHeaders, isUsableXDocument, X_SHELL_URLS } from './lib/transaction'

export type { ITweetFilter } from './lib/types/args/FetchArgs'

export type { INewTweet, IUploadArgs } from './lib/types/args/PostArgs'
// TYPES
export type * from './lib/types/enriched'

export type { Logger } from './lib/types/Logger'
export type { IAudioSpace, IAudioSpaceByIdResponse } from './lib/types/raw/space/Details'
export type { ITweetDetailsResponse } from './lib/types/raw/tweet/Details'
export type { ITweetRepliesResponse } from './lib/types/raw/tweet/Replies'
export type { ITweetSearchResponse } from './lib/types/raw/tweet/Search'
export type { IUserDetailsResponse } from './lib/types/raw/user/Details'
export type { IUserTweetsResponse } from './lib/types/raw/user/Tweets'
export type { IRettiwtConfig } from './lib/types/RettiwtConfig'
export type { TidContext, TidProvider } from './lib/types/TidProvider'
