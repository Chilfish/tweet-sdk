# Public API

`src/index.ts` is the core entry; `src/node.ts` is the `./node` subpath entry; `src/cli.ts` is the `./cli` entry; `src/cli-bin.ts` is the bin (`tweet-cli`). Internal paths under `src/lib/**` are not part of the public API.

## Entries

| Entry | Artifacts | Runtime |
|---|---|---|
| `@chilfish/tweet` | `dist/index.js` / `dist/index.cjs` | Platform-agnostic (fetch is all it needs) |
| `@chilfish/tweet/node` | `dist/node.js` / `dist/node.cjs` | Node 20+ (`node:fs`, undici dispatcher) |
| `@chilfish/tweet/cli` | `dist/cli.js` / `dist/cli.cjs` | Node 20+ (embeddable command tree) |
| `tweet-cli` (bin) | `dist/cli-bin.js` | Node 20+ (`bunx` / `npx`) |
| `@chilfish/tweet/react` | Phase 3 (pending) | Browser |

The ESM / CJS public surfaces of each entry are identical, with type declarations at `index.d.ts` / `index.d.cts` (likewise for `node.*` and `cli.*`).

## core export surface

### Fetching

| Export | Description |
|---|---|
| `TwitterClient` | Facade: `getTweet` / `getReplies` / `searchTweets` / `getUser` / `getUserTimeline` / `getListTweets` / `getSpace` / `run` |
| `parseSearchTimeline` | Pure function: `SearchTimeline` response → tweet list + next-page cursor |
| `RettiwtPool` | Multi-key round-robin pool (cooldown / backoff / load balancing) |
| `RettiwtConfig` / `DefaultRettiwtHeaders` | Runtime configuration |
| `FetcherService` | Low-level requests: `request(ResourceType, args)` |
| `TwitterAPIClient` | Raw fetch composition layer (pool + resource types) |
| `TweetEnrichmentService` | Bulk enrichment helper |
| `ResourceType` / `TweetRepliesSortType` / `BaseType` | Resource and sort enums |

### Transport and configuration

| Export | Description |
|---|---|
| `HttpClient` / `HttpRequest` / `HttpResponse` | Neutral transport contract |
| `createFetchHttpClient` / `defaultHttpClient` | fetch implementation |
| `IRettiwtConfig` | `apiKey` / `timeout` / `headers` / `delay` / `maxRetries` / `httpClient` / `tidProvider` |
| `TidProvider` / `TidContext` | Injectable transaction-id provider |
| `buildXShellHeaders` / `isUsableXDocument` / `X_SHELL_URLS` | Probing rules of the default transaction-id implementation |

### Errors

| Export | status |
|---|---|
| `TwitterApiError` | Any; base class carrying `status` / `code` / `resource` |
| `RateLimitError` | 429 |
| `AuthError` | 401 / 403 |
| `NotFoundError` | 404 |

### Parsing and enrichment

| Export | Description |
|---|---|
| `enrichTweet` | `RawTweet` → `EnrichedTweet` (retweet expansion, entities, cards, polls, articles, media) |
| `getEntities` / `getMediaAltEntities` / `serializeForAI` / `restoreEntities` / `applyAITranslations` | Entity splitting and translation payloads |
| `mapTwitterCard` / `mapMediaDetails` / `mapPollCard` / `mapArticle` / `mapSpaceDetails` / `attachSpaceDetails` | Card-style mappers |
| `resolveSpaceId` / `extractAudiospaceId` / `isSpaceUrl` / `resolveSpacePlaybackState` / `formatSpace*` | Space detection and formatting |
| `resolveArticleId` / `resolveArticleLink` / `isArticleUrl` / `parseContentState` | Article detection and block parsing |
| `parseTrendingCard` | jetfuel payload → Trending card |
| `organizeTweets` | Thread / reply-section organization |
| `formatDate` | Time-zone formatting |
| `normalizeMediaUrl` / `normalizeProfileImageUrl` | twimg media and avatar URL normalization |

### Types

`EnrichedTweet` / `EnrichedUser` / `RawTweet` / `RawUser` / `TweetData` / `Entity` / `MediaDetails` / `TweetPoll` / `TweetArticle` / `LinkPreviewCard` / `TrendingCardInfo` / `SpaceDetails` / `SpaceAvailability` and so on; see `src/lib/types/enriched/` for details.

Field naming conventions (since 0.1.0):

- Tweet id: `id` (not `id_str`)
- Quoted tweet: `quotedTweet` / `quotedTweetId`
- Retweet event id: `retweetedOriginalId`
- Inline media: `isInlineMedia`
- Reply target: `in_reply_to_status_id_str`

## node export surface

| Export | Description |
|---|---|
| `createNodeClient(options)` | Reads `TWEET_KEYS` / `http_proxy` and returns a `TwitterClient` |
| `createProxyFetch(proxy)` | `HttpClient` backed by the undici `ProxyAgent` (`http(s)://`) |
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
