# Migrating from an inlined Rettiwt-API copy

`@chilfish/tweet` is the extracted fetch + enrichment layer. This page covers the two
changes a consumer of an inlined copy has to make: import paths and the 0.1 field
renames.

## 1. Replace vendor imports

Application code should use the stable entries:

```ts
import { enrichTweet, TwitterClient, TwitterAPIClient } from '@chilfish/tweet'
```

Raw response types, extractors, request descriptors and fixtures keep their shape
behind the **unstable** `./internals` entry:

```ts
import type {
  IListTweetsResponse,
  ITweetDetailsResponse,
  ITweetRepliesResponse,
  ITweetSearchResponse,
  IUser,
  IUserDetailsResponse,
  IUserTweetsResponse,
  RawArticleResult,
  UserData,
  UserDetails,
} from '@chilfish/tweet/internals'
import {
  Extractors,
  findByFilter,
  ListRequests,
  MediaRequests,
  Requests,
  SpaceRequests,
  TweetFilter,
  TweetRequests,
  UserRequests,
} from '@chilfish/tweet/internals'
```

This lets a consumer delete its `packages/rettiwt-api` copy while keeping the
type-level, descriptor and fixture tests that guard against upstream drift.

| Old copy import | New import |
|---|---|
| `../rettiwt-api/src/lib/types/raw/**` (`I*Response`, `IUser`, `IRawSpace`) | `@chilfish/tweet/internals` |
| `../rettiwt-api/src/lib/collections/Extractors` | `Extractors` from `@chilfish/tweet/internals` |
| `../rettiwt-api/src/lib/models/args/FetchArgs` (`TweetFilter`) | `TweetFilter` from `@chilfish/tweet/internals` |
| `../rettiwt-api/src/lib/requests/*` | `Requests` / `TweetRequests` / `SpaceRequests` / `ListRequests` / `UserRequests` / `MediaRequests` from `@chilfish/tweet/internals` |
| `../rettiwt-api/src/lib/helper/JsonUtils` (`findByFilter`) | `findByFilter` from `@chilfish/tweet/internals` |
| `Awaited<ReturnType<TwitterClient['getUser']>>` | `UserDetails` from `@chilfish/tweet/internals` |
| persisted `fetchUserDetails()` JSON | `UserData` from `@chilfish/tweet/internals` |
| `TwitterAPIClient` (type-only before) | runtime value from `@chilfish/tweet` |

The three user types are different: `IUser` is the raw upstream response,
`UserData` is the structural model data written by `User.toJSON()` (use this for
cache/database columns), and `UserDetails` is the `User` class instance type.

`./internals` has no SemVer guarantee: it mirrors `src/lib/**` and may change in a
minor release. Move application code off it once the parity tests are ported.

## 2. Field renames since 0.1

The public `EnrichedTweet` contract is camelCase and intentional; adapt at the
boundary instead of asking for the old snake_case names.

| Old copy | New |
|---|---|
| `id_str` | `id` |
| `quoted_tweet_id` | `quotedTweetId` |
| `retweetedOrignalId` | `retweetedOriginalId` |
| `isInlineMeida` | `isInlineMedia` |
| `in_reply_to_status_id_str` (kept) | `parent_id` (alias, populated from the same field) |

## 3. Enrichment differences

`enrichTweet` now fills the counters and reply parent that older copies left
undefined:

| Field | Source |
|---|---|
| `parent_id` | `legacy.in_reply_to_status_id_str` |
| `replyCount` | `legacy.reply_count` |
| `likeCount` | `legacy.favorite_count` |
| `retweetCount` | `legacy.retweet_count` |
| `viewCount` | `views.count` |

Card `title` / `description` are cleaned of zero-width placeholders
(`\u200B-\u200D`, `\uFEFF`) and trimmed, so an official empty title falls back to the
domain instead of rendering invisible text.

`TweetRequests.details()` now requests the Article rich content state and plain
text (`withArticleRichContentState` / `withArticlePlainText`), and `replies()`
requests the plain fallback too. `mapArticle()` therefore sees
`article.article_results.result.content_state` instead of falling back to the
bare link.

## 4. Runtime factory and proxy

`createClient` is platform-neutral and never reads `process.env`:

```ts
import { createClient } from '@chilfish/tweet'

const client = createClient({ keys, proxy, logger })
```

A `keys` string containing a comma is split and trimmed like `TWEET_KEYS`
(`createClient({ keys: process.env.TWEET_KEYS })` now keeps multi-key rotation);
a comma-free string remains a single key.

Native proxy support is **Bun-only**. On Node, `createNodeClient` keeps the
environment-based convenience path and `createProxyFetch` (from `./node`) uses
undici. On Workers, Deno and browsers there is no native proxy option; pass a
custom `httpClient` if you need one.

## 5. Errors, retries and time zones

- `NotSupportedError` carries `status: 403` by default. Map
  `instanceof NotSupportedError` to a config/auth response instead of falling
  back to 500. `AuthError` stays 401/403; the pool does not retry or reclassify
  `NotSupportedError`.
- The default pool classifier retries `408` / `425` / `5xx` without cooling the
  key down; `429` / `401` / `403` rotate and cool the key. `shouldRetry` remains
  injectable.
- `pool.status()` exposes per-key `keySuffix` / `cooldownLeftMs` / `failStreak` /
  `inFlight` for health endpoints and metrics.
- `formatDate` defaults to the runtime's local time zone. Workers run in UTC, so
  pass an explicit `timeZone` (for example `'Asia/Shanghai'`) when you need the
  old wrapper's formatting.
