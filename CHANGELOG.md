# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/).

## Unreleased

## 0.2.1 — 2026-11-19

### Added

- `UserData` (structural `IUser` model data) in `./internals`, alongside `UserDetails` (class) and the raw `IUser`, so persisted user JSON can be typed without assertions.
- `ListRequests` / `UserRequests` / `MediaRequests` in `./internals`, completing the request-descriptor surface.
- `RettiwtPool.status()` and the `PoolKeyStatus` type for health endpoints and metrics.
- Type-level contract tests for the `./internals` type-only exports.
- Workerd smoke coverage for the default transaction-id path (`defaultTidProvider` + `FetcherService` against a local shell fixture, with `nodejs_compat`).

### Changed

- `createClient({ keys: string })` splits comma-separated keys like `createNodeClient` / `TWEET_KEYS`; comma-free strings stay a single key.
- `NotSupportedError` now carries `status: 403` so consumers mapping `error.status` do not fall back to 500; the pool's default classifier leaves it untouched instead of exhausting into `AuthError`.
- The default pool classifier retries `408` / `425` / `5xx` without cooldown; `429` / `401` / `403` keep rotation + cooldown.
- Proxy errors and migration docs now describe native proxy support as Bun-only (Workers / Deno / browsers have no native option).

## 0.2.0 — 2026-11-19

### Added

- `./internals` subpath (unstable, no SemVer guarantee): raw response types, `Extractors`, `Requests`, `TweetRequests`, `SpaceRequests`, `FetchResourcesGroup`, `AllowGuestAuthenticationGroup`, `findByFilter`, `TweetFilter`, `UserDetails` and `TwitterAPIClient` for downstream migrations and parity tests.
- `createClient` / `TwitterClientOptions` / `CreateClientOptions`: platform-neutral factory with no `process.env` access, plus explicit `keys` / `cookie` / `proxy` options.
- `NotSupportedError` for resources that require a user credential, and `PoolExhaustedError` that preserves the real cause instead of fabricating 401.
- Shared `Logger` contract (`RettiwtPoolLogger` / `ParseLogger` are aliases) and documented event fields; `pool.rotate` now emits `keySuffix`.
- `RettiwtPoolOptions.proxy`: Bun uses the native `fetch` proxy option; Node keeps the undici dispatcher through `createProxyFetch`.
- Bun and workerd (Miniflare) runtime smoke jobs in CI, including a dead-proxy assertion and a mock-HTTP path over the built package.

### Fixed

- `enrichTweet` now populates `parent_id`, `replyCount`, `likeCount`, `retweetCount` and `viewCount` (previously declared but always empty).
- `mapTwitterCard` cleans zero-width title/description placeholders before the empty-card fallback.
- `TwitterAPIClient` is now a runtime export (it was type-only while the docs listed it as a core export).
- `getUser()` / the `User` model normalize the avatar size suffix (`_normal` and friends).
- `RESOURCE_NOT_ALLOWED` and `BAD_AUTHENTICATION` are thrown as typed errors.
- Pool exhaustion caused by a network/parse failure is no longer classified as 401.

## 0.1.1 — 2026-11-19

### Fixed

- Manual `npm publish` no longer aborts with `EUSAGE` provenance errors: `publishConfig.provenance` was removed and the CI workflow passes `--provenance` explicitly.
- The CI `runtime` job now installs production dependencies before importing `dist`, so externalized runtime deps (`linkedom`, `x-client-transaction-id`) resolve on every Node version.
- `verify:package` accepts both the npm 11 array and npm 12 object shapes of `pack --json`; the publish workflow pins npm 11 for a stable publisher.

### Internal

- First release published through the npm Trusted Publisher (OIDC) workflow, validating the repository binding.

## 0.1.0 — 2026-11-19

### Added

- Added `tweet-cli` (`bin`) and the `./cli` subpath: `tweet get/replies/search`, `user get/timeline`, `space get`, `list tweets`, `media download`.
  The CLI is built on citty (inlined at build time, zero runtime dependencies), defaults to JSON output, offers a human-readable `--format markdown` view, and emits a JSON error envelope on stderr.
- The CLI validates unknown arguments before `runMain` (including "closest candidate" and "arguments must come after the subcommand" hints); `--help` aligns to the terminal display width (CJK counts as 2 columns).
- `media download` streams NDJSON events (`item` / `done`), supports concurrency and `--dry-run`, and downloads original images and the highest-bitrate mp4.
- The package became `@chilfish/tweet`: an X data fetching + tweet enrichment SDK, with multiple entries in a single package (`.` core, `./node` Node adapter, `./cli` command line, `./react` pending Phase 3).
- Platform-agnostic transport layer: `HttpClient` / `HttpRequest` / `HttpResponse`, with a `fetch` implementation by default and timeouts via `AbortSignal.timeout`.
  `requests/*` moved from axios configuration to neutral request descriptors, and `paramsSerializer` is now handled uniformly by `encodeQueryParams`.
- Typed errors: `TwitterApiError` / `RateLimitError` / `AuthError` / `NotFoundError`, replacing `TwitterError` and `ErrorService`.
- `RettiwtPool`: per-key cooldown, exponential backoff, `inFlight` load balancing, with injectable classifier / fetcher factory / logger.
- Parsing layer moved into core: `enrichTweet`, `getEntities`, `mapTwitterCard`, `mapPollCard`, `mapArticle`, `mapSpaceDetails`, `attachSpaceDetails`, `organizeTweets`, `parseTrendingCard`, `normalizeMediaUrl`.
- `TwitterClient` facade: `getTweet` / `getReplies` / `searchTweets` / `getUser` / `getUserTimeline` / `getListTweets` / `getSpace`.
- `./node` entry: `createNodeClient` (`TWEET_KEYS` / `http_proxy`), `createProxyFetch` (undici `ProxyAgent`), `readMediaFile`.
- Merged anonTweet capabilities: jetfuel Trending cards, X Article type and block parsing, guest search allowlisting, pinned tweet ID lists.
- Test migration: Space / poll / card / transaction-id fixtures, plus new HTTP, Pool, enrich, and export-surface contract tests.
- Audit fixes: transaction-id caching per session cookie (10 min TTL, concurrent de-duplication, one refetch on stale shell), guest-credential caching per fetcher, a 30 s default request timeout (`timeout: 0` disables), body-level error classification (code 32/89 → auth, 88 → rate limit), and `FetcherService` / `AuthService` / `TwitterClient` unit tests.

### Changed

- `EnrichedTweet` fields unified to `id` / `quotedTweet` / `quotedTweetId` / `retweetedOriginalId` / `isInlineMedia`.
- `formatDate` now defaults to `yyyy-MM-dd HH:mm:ss`, uses the runtime's time zone (optional `timeZone` argument), and no longer forces Asia/Shanghai; `formatSpaceDate` returns English month names (`Sep 17`).
- Card CTA labels are English (`Learn more`, `Watch`, `Shop now`, …).
- Transport layer de-axios'd: removed the `axios`, `cookiejar`, `form-data`, `node:querystring`, and `node:https` Agent dependencies.
- Media upload now uses `Uint8Array | Blob`; file reading is handled by `readMediaFile` from `./node`.
- Cookie parsing and base64 encode/decode now use built-in implementations (`atob` / `btoa`) and no longer depend on Node `Buffer`.
- Runtime dependencies are `linkedom` and `x-client-transaction-id`; `undici` is an optional peer used only by the `./node` proxy dispatcher and loaded lazily.
- Removed dead code: the unused `Rettiwt` facade, five services only reachable from it, and five unreferenced raw response types.
- The legacy `Rettiwt` facade is no longer exported; use `FetcherService` + `ResourceType` for low-level control.
- Added `NOTICE.md`, retaining the original copyright of Rettiwt-API (MIT, 6.2.0) and react-tweet (MIT).
- Build tooling migrated from unbuild to tsdown, producing ESM + CJS dual format with standalone type declarations.
- Package manager switched from pnpm to Bun, with `bun.lock` as the lockfile.
- `CI/release`: the `publish` job now requires the repository variable `NPM_OIDC_READY=true`, so pushing a tag never publishes before the npm package and its Trusted Publisher exist; the first release is manual.
- lefthook now owns Git hooks: pre-commit runs `eslint --fix` on staged files, pre-push builds.
- Fixed `exports` conditional types, `engines`, `publishConfig`, and other metadata.
- Tests moved to `tests/`, with export-surface contract tests and coverage configuration added.
- Added the `docs/` documentation system, `AGENTS.md`, and `CHANGELOG.md`.
- Added out-of-the-box infrastructure: `examples/`, `scripts/verify-package.mjs`, `scripts/verify-release-tag.mjs`, `scripts/check-docs.mjs`.
- Added community files: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, Issue/PR templates, `.editorconfig`, `.nvmrc`, and Dependabot.
- CI now includes artifact verification, documentation checks, example runs, and coverage upload; publishing now polls the registry.

### Fixed

- The Node 20 job in CI no longer runs the build (tsdown requires Node ≥22); it now consumes the `dist` artifact to verify the runtime.
- Dependabot ignores `typescript >=7`, which `typescript-eslint` does not support yet.
