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
  UserDetails,
} from '@chilfish/tweet/internals'
import { Extractors, findByFilter, Requests, SpaceRequests, TweetFilter, TweetRequests } from '@chilfish/tweet/internals'
```

This lets a consumer delete its `packages/rettiwt-api` copy while keeping the
type-level, descriptor and fixture tests that guard against upstream drift.

| Old copy import | New import |
|---|---|
| `../rettiwt-api/src/lib/types/raw/**` (`I*Response`, `IUser`, `IRawSpace`) | `@chilfish/tweet/internals` |
| `../rettiwt-api/src/lib/collections/Extractors` | `Extractors` from `@chilfish/tweet/internals` |
| `../rettiwt-api/src/lib/models/args/FetchArgs` (`TweetFilter`) | `TweetFilter` from `@chilfish/tweet/internals` |
| `../rettiwt-api/src/lib/requests/*` | `Requests` / `TweetRequests` / `SpaceRequests` from `@chilfish/tweet/internals` |
| `../rettiwt-api/src/lib/helper/JsonUtils` (`findByFilter`) | `findByFilter` from `@chilfish/tweet/internals` |
| `Awaited<ReturnType<TwitterClient['getUser']>>` | `UserDetails` from `@chilfish/tweet/internals` |
| `TwitterAPIClient` (type-only before) | runtime value from `@chilfish/tweet` |

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

## 4. Runtime factory and proxy

`createClient` is platform-neutral and never reads `process.env`:

```ts
import { createClient } from '@chilfish/tweet'

const client = createClient({ keys, proxy, logger })
```

On Node, `createNodeClient` keeps the environment-based convenience path and
`createProxyFetch` (from `./node`) uses undici. On Bun, the same helper uses Bun's
native `fetch` proxy option; setting `RettiwtPoolOptions.proxy` directly also works
there.
