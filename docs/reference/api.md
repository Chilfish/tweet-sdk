# Public API

`src/index.ts` is the core entry; `src/node.ts` is the `./node` subpath entry; `src/cli.ts` is the `./cli` entry; `src/cli-bin.ts` is the bin (`tweet-cli`); `src/internals.ts` is the explicitly unstable `./internals` entry. Internal paths under `src/lib/**` are not part of the public API.

## Entries

| Entry | Artifacts | Runtime |
|---|---|---|
| `@chilfish/tweet` | `dist/index.js` / `dist/index.cjs` | Platform-agnostic (fetch is all it needs) |
| `@chilfish/tweet/node` | `dist/node.js` / `dist/node.cjs` | Node 20+ (`node:fs`, undici dispatcher); the proxy helper is Bun-aware |
| `@chilfish/tweet/cli` | `dist/cli.js` / `dist/cli.cjs` | Node 20+ (embeddable command tree) |
| `@chilfish/tweet/internals` | `dist/internals.js` / `dist/internals.cjs` | Platform-agnostic, **unstable** (no SemVer guarantee) |
| `tweet-cli` (bin) | `dist/cli-bin.js` | Node 20+ (`bunx` / `npx`) |
| `@chilfish/tweet/react` | Phase 3 (pending) | Browser |

The ESM / CJS public surfaces of each entry are identical, with type declarations at `index.d.ts` / `index.d.cts` (likewise for `node.*`, `cli.*` and `internals.*`).

## core export surface

### Fetching

| Export | Description |
|---|---|
| `TwitterClient` | Facade: `getTweet` / `getReplies` / `searchTweets` / `getUser` / `getUserTimeline` / `getListTweets` / `getSpace` / `run` |
| `createClient(options)` | Platform-neutral factory; never reads `process.env`. Accepts `keys` / `cookie` plus all `RettiwtPoolOptions` |
| `TwitterClientOptions` / `CreateClientOptions` | Named option types (`CreateClientOptions` adds `keys` / `cookie`) |
| `parseSearchTimeline` | Pure function: `SearchTimeline` response → tweet list + next-page cursor |
| `RettiwtPool` | Multi-key round-robin pool (cooldown / backoff / load balancing) |
| `RettiwtConfig` / `DefaultRettiwtHeaders` | Runtime configuration |
| `FetcherService` | Low-level requests: `request(ResourceType, args)` |
| `TwitterAPIClient` | **Runtime value**: raw fetch composition layer (pool + resource types), including `onFetchedresponse` |
| `TweetEnrichmentService` | Bulk enrichment helper |
| `ResourceType` / `TweetRepliesSortType` / `BaseType` | Resource and sort enums |

`RettiwtPoolOptions.proxy` creates a transport when `httpClient` is absent. On Bun it uses the native `fetch` `proxy` option. On Node the core factory throws a guidance error because importing undici in the core would break Workers builds; use `createProxyFetch` / `createNodeClient` from `@chilfish/tweet/node` instead.

### Transport and configuration

| Export | Description |
|---|---|
| `HttpClient` / `HttpRequest` / `HttpResponse` | Neutral transport contract |
| `createFetchHttpClient` / `defaultHttpClient` | fetch implementation |
| `IRettiwtConfig` | `apiKey` / `timeout` / `headers` / `delay` / `maxRetries` / `httpClient` / `tidProvider` |
| `TidProvider` / `TidContext` | Injectable transaction-id provider |
| `buildXShellHeaders` / `isUsableXDocument` / `X_SHELL_URLS` | Probing rules of the default transaction-id implementation |
| `Logger` | Shared `warn(event, fields?)` contract for pool / enrichment / Space logs |

### Errors

| Export | status |
|---|---|
| `TwitterApiError` | Any; base class carrying `status` / `code` / `resource` |
| `RateLimitError` | 429 |
| `AuthError` | 401 / 403 |
| `NotFoundError` | 404 |
| `NotSupportedError` | `undefined`; the resource needs a user credential but only a guest session is available |
| `PoolExhaustedError` | `undefined` unless the last failure carried 429/401/403; preserves the real network/parse cause |

`RESOURCE_NOT_ALLOWED` and `BAD_AUTHENTICATION` are thrown as `NotSupportedError` and `AuthError` respectively, so consumers can branch with `instanceof` instead of matching messages.

### Logger contract

`Logger` is the shared structured logger (`warn(event, fields?)`) used by `RettiwtPool`, `enrichTweet`, `mapTwitterCard` and `attachSpaceDetails`. `RettiwtPoolLogger` and `ParseLogger` are aliases.

| Event | Fields |
|---|---|
| `pool.rotate` | `keySuffix` (`...<last 6>` or `NO_KEY`), `failStreak`, `cooldownMs`, `reason` |
| `pool.exhaust` | `attempts`, `states` |
| `jetfuel.parse.fallback` | `card`, `payloadHash`, `reason` |
| `space.fetch.failed` | `spaceId`, `tweetId`, `reason` |

### Parsing and enrichment

| Export | Description |
|---|---|
| `enrichTweet` | `RawTweet` → `EnrichedTweet` (retweet expansion, entities, cards, polls, articles, media, counters) |
| `getEntities` / `getMediaAltEntities` / `serializeForAI` / `restoreEntities` / `applyAITranslations` | Entity splitting and translation payloads |
| `mapTwitterCard` / `mapMediaDetails` / `mapPollCard` / `mapArticle` / `mapSpaceDetails` / `attachSpaceDetails` | Card-style mappers |
| `resolveSpaceId` / `extractAudiospaceId` / `isSpaceUrl` / `resolveSpacePlaybackState` / `formatSpace*` | Space detection and formatting |
| `resolveArticleId` / `resolveArticleLink` / `isArticleUrl` / `parseContentState` | Article detection and block parsing |
| `parseTrendingCard` | jetfuel payload → Trending card |
| `organizeTweets` | Thread / reply-section organization |
| `formatDate` | Time-zone formatting |
| `normalizeMediaUrl` / `normalizeProfileImageUrl` | twimg media and avatar URL normalization |

`EnrichedTweet` interaction counters are always populated:

| Field | Upstream source |
|---|---|
| `parent_id` | `legacy.in_reply_to_status_id_str` (absent for top-level tweets) |
| `replyCount` | `legacy.reply_count ?? 0` |
| `likeCount` | `legacy.favorite_count ?? 0` |
| `retweetCount` | `legacy.retweet_count ?? 0` |
| `viewCount` | `Number(views.count) || 0` |

Card `title` / `description` are cleaned of zero-width placeholders (`\u200B-\u200D`, `\uFEFF`) and trimmed; an all-placeholder value becomes `''`.

### Types

`EnrichedTweet` / `EnrichedUser` / `RawTweet` / `RawUser` / `TweetData` / `Entity` / `MediaDetails` / `TweetPoll` / `TweetArticle` / `LinkPreviewCard` / `TrendingCardInfo` / `SpaceDetails` / `SpaceAvailability` and so on; see `src/lib/types/enriched/` for details.

Field naming conventions (since 0.1.0):

- Tweet id: `id` (not `id_str`)
- Quoted tweet: `quotedTweet` / `quotedTweetId`
- Retweet event id: `retweetedOriginalId`
- Inline media: `isInlineMedia`
- Reply target: `in_reply_to_status_id_str` / `parent_id`

`TwitterClient.getUser()` returns a `User` model whose `profileImage` is size-normalized (`_normal` / `_bigger` / `_mini` / `_400x400` stripped).

## internals export surface

`@chilfish/tweet/internals` is **unstable** and has no SemVer guarantees. It mirrors `src/lib/**` for parity tests and fixtures:

| Group | Exports |
|---|---|
| Raw types | `IUser` / `IRawSpace` / `ISpaceDetailsResponse` / `IListTweetsResponse` / `ITweetDetailsResponse` / `ITweetRepliesResponse` / `ITweetSearchResponse` / `IUserDetailsResponse` / `IUserTweetsResponse` / `RawArticle*` |
| Models | `UserDetails` (`User` class type) / `TweetFilter` / `FetchArgs` |
| Collections | `Extractors` / `Requests` / `TweetRequests` / `SpaceRequests` / `FetchResourcesGroup` / `AllowGuestAuthenticationGroup` |
| Helpers | `findByFilter` |
| Services | `TwitterAPIClient` |

See [migration.md](../guide/migration.md) for the vendor-copy replacement recipe.

## node export surface

| Export | Description |
|---|---|
| `createNodeClient(options)` | Reads `TWEET_KEYS` / `http_proxy` and returns a `TwitterClient` |
| `createProxyFetch(proxy)` | `HttpClient` backed by Bun's native `fetch` proxy option or Node's undici `ProxyAgent` (`http(s)://`) |
| `readMediaFile(path)` | Reads a file as a `Blob` for use with `tweet.upload` |
| `CreateNodeClientOptions` | `keys` / `cookie` / `proxy` / `timeout` / `maxRetries` / `headers` / `logger` |

## cli export surface

| Export | Description |
|---|---|
| `main` | citty command tree root (`tweet` / `user` / `space` / `list` / `media`) |
| `withErrorEnvelope(command)` | Recursively wraps `run` and emits the unified JSON error envelope |
| `formatCliError(error)` | Error → `{ event, code, message, ... }` |
| `assertKnownFlags(root, argv)` | Unknown-argument validation (including closest-candidate suggestions) |
| `showCliUsage(command, parent?)` | Help rendering aligned to the terminal width |

The behavior and output contract of the `tweet-cli` bin are documented in [cli.md](../guide/cli.md).

## Contract

- Named exports only; there is no default export.
- Adding or removing an export is a public-contract change: update `tests/exports.test.ts`, this document and `CHANGELOG.md` together.
- `package.json#exports` defines the published surface; the build must not rewrite it.
- `./internals` is explicitly unstable: it may change in a minor release, so application code should not depend on it.
