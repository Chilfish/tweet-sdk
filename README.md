# @chilfish/tweet

> An SDK for X (Twitter) data fetching and tweet enrichment: platform-agnostic core, Node adapter, and React components.

[![CI](https://github.com/Chilfish/tweet-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Chilfish/tweet-sdk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@chilfish/tweet.svg)](https://www.npmjs.com/package/@chilfish/tweet)
[![License](https://img.shields.io/github/license/Chilfish/tweet-sdk.svg)](./LICENSE.md)

## Features

- **Platform-agnostic core** — the transport layer is an injectable `HttpClient` that defaults to `fetch`; Workers / Deno / Bun / browsers / Node all share the same implementation.
- **Single package, multiple entries** — `.` (core), `./node` (proxy and file upload), `./cli`, `./internals` (unstable raw/extractor layer), and `./react` (components, Phase 3).
- **Typed errors** — `TwitterApiError` / `RateLimitError` / `AuthError` / `NotFoundError` / `NotSupportedError` / `PoolExhaustedError`; the Pool reads `status` directly and preserves the real cause.
- **Runtime-ready** — Workers and Bun smoke jobs run in CI; Bun supports a first-class `proxy` option, Node uses the undici dispatcher.
- **Multi-key rotation pool** — per-key cooldown, exponential backoff, `inFlight` load balancing, injectable classifier and logger.
- **Parsing as contract** — the `EnrichedTweet` produced by `enrichTweet` is the only contract between core and UI.
- **Dual-format output** — ESM / CJS each ship their own type declarations, with `sideEffects: false`.
- **Strict typing** — `strict` + `verbatimModuleSyntax`, enforcing `import type` / `export type`.

## Requirements

| Tool | Version |
|---|---|
| Bun | 1.4.4+ |
| Node.js | 20+ (only needed for the `./node` entry) |

## Installation

```bash
bun add @chilfish/tweet
```

## Quick start

```ts
import { enrichTweet, TwitterClient } from '@chilfish/tweet'

const client = new TwitterClient(process.env.TWEET_KEYS!)
const raw = await client.getTweet('1968314084207788302')
const tweet = enrichTweet(raw)

console.log(tweet?.text, tweet?.mediaDetails?.length)
```

On Node, use the convenience factory from `./node` (reads `TWEET_KEYS` / `http_proxy`, supports file uploads):

```ts
import { createNodeClient, readMediaFile } from '@chilfish/tweet/node'

const client = createNodeClient({ proxy: 'http://127.0.0.1:7890' })
await client.run(fetcher => fetcher.request('MEDIA_UPLOAD_APPEND', {
  upload: { id, media: await readMediaFile('photo.jpg') },
}))
```

On Workers / Bun, build the client without environment access:

```ts
import { createClient, enrichTweet } from '@chilfish/tweet'

const client = createClient({ keys: env.TWEET_KEYS.split(','), logger })
const tweet = enrichTweet(await client.getTweet(id))
```

Bun proxying is a native first-class option; `createProxyFetch` from `./node` uses Bun's `fetch({ proxy })` and falls back to undici on Node. On Node, prefer `createNodeClient` / `createProxyFetch`, because the core factory does not import undici.

```ts
import { createClient } from '@chilfish/tweet'

const client = createClient({
  keys,
  proxy: process.env.TWEET_PROXY,
})
```

Low-level raw composition (including the `onFetchedresponse` hook) is a runtime export:

```ts
import { RettiwtPool, TwitterAPIClient } from '@chilfish/tweet'

const api = new TwitterAPIClient(new RettiwtPool(keys, { proxy }))
api.onFetchedresponse = async (key, data) => { /* archive raw payload */ }
const { tweets, cursor } = await api.fetchUserTimelineWithRepliesRaw(userId)
```

## Command line

```bash
# Use tweet-cli after a global install
bun add -g @chilfish/tweet

# Or run it directly
bunx @chilfish/tweet tweet get 1968314084207788302 -f md
npx @chilfish/tweet tweet search '#buildinpublic' --type latest
```

```text
tweet-cli
├── tweet get <id>                  Single tweet (enriched by default; --raw outputs the raw payload)
├── tweet replies <id>              Replies + nextCursor
├── tweet search <query>            Search (supports from: / since: / min_faves: and more)
├── user get <id|username>          User profile
├── user timeline <id>              User timeline
├── space get <id>                  Space metadata
├── list tweets <id>                List tweets
└── media download <id> -o <dir>    Download original images / highest-bitrate mp4
```

- Authentication: `--keys` / `--cookie` / `TWEET_KEYS` from `.env`; `--proxy` or `http_proxy` from `.env`.
- Output: queries default to JSON, `--format markdown` (`-f md`) produces a human-readable view; errors go to stderr as a JSON envelope.
- `media download` streams NDJSON events (`item` / `done`).

See [docs/guide/cli.md](./docs/guide/cli.md) for details.

## Entries

| Entry | Contents | Runtime |
|---|---|---|
| `@chilfish/tweet` | transport / requests / auth / pool / parse / types | Platform-agnostic |
| `@chilfish/tweet/node` | proxy dispatcher, `readMediaFile`, `createNodeClient` | Node 20+ (Bun-aware proxy) |
| `@chilfish/tweet/cli` | Embeddable citty command tree | Node 20+ |
| `@chilfish/tweet/internals` | Raw types, `Extractors`, `Requests`, `TwitterAPIClient` | Platform-agnostic, **unstable** |
| `tweet-cli` (bin) | Same as above, for `bunx` / `npx` / global install | Node 20+ |
| `@chilfish/tweet/react` | Tweet display components (Phase 3, not released yet) | Browser |

`./internals` has no SemVer guarantee; it exists so consumers migrating from an inlined Rettiwt-API copy can keep their fixture and parity tests. See [the migration guide](./docs/guide/migration.md).

## Commands

| Command | Description |
|---|---|
| `bun run dev` | tsdown watch build |
| `bun run build` | Build ESM + CJS + type declarations |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint with autofix |
| `bun run lint:check` | ESLint check only |
| `bun run test` | Run the tests once |
| `bun run test:coverage` | Run with v8 coverage |
| `bun run check` | Full gate (types + lint + tests + build + artifact verification) |
| `bun run check:docs` | Verify documentation links and index |
| `bun run cli` | Run the CLI locally (`bun src/cli-bin.ts`) |
| `bun run example` | Run the examples |
| `bun run verify:package` | Verify the published artifacts |
| `bun run smoke:bun` | Bun runtime smoke (mock HTTP + native proxy) |
| `bun run smoke:workers` | workerd runtime smoke through Miniflare |
| `bun run release` | Bump the version, commit, tag, and push |

## Directory structure

```
src/
  index.ts                    # core public entry
  node.ts                     # ./node entry
  lib/
    http/                     # HttpClient + fetch implementation + encoding utilities
    transaction.ts            # x-client-transaction-id acquisition
    errors.ts                 # typed errors
    pool/                     # RettiwtPool
    client.ts                 # TwitterClient facade
    collections/ enums/ models/ requests/ services/   # fetch layer (derived from Rettiwt-API)
    parse/                    # enrich / entities / poll / space / article / jetfuel
    types/                    # raw + enriched types
    media-url.ts
  node/                       # Node adapter implementation
tests/                        # unit tests, mirroring src/
examples/                     # runnable examples
docs/                         # internal documentation
scripts/                      # gate and release scripts
```

## Release process

1. Describe the changes for this release under `## Unreleased` in `CHANGELOG.md`.
2. Run `bun run release`; `bumpp` bumps the version, commits, tags, and pushes.
3. The pushed `v*` tag triggers `publish.yml`: it verifies the tag against `package.json`, the CHANGELOG version section, and the full gate, then runs `npm publish --provenance`.
4. Until the npm package exists and its Trusted Publisher is configured, the `publish` job is skipped (repository variable `NPM_OIDC_READY` unset) and the first release is published manually; set `NPM_OIDC_READY=true` afterwards.

See [docs/engineering/build-and-release.md](./docs/engineering/build-and-release.md) and the [release checklist](./docs/engineering/release-checklist.md) for details.

## Documentation

- [docs/README.md](./docs/README.md) — documentation index and "when to read what"
- [docs/reference/api.md](./docs/reference/api.md) — public API and export surface
- [docs/guide/migration.md](./docs/guide/migration.md) — migrating from an inlined Rettiwt-API copy
- [docs/engineering/architecture.md](./docs/engineering/architecture.md) — architecture and layering
- [docs/reference/package-contract.md](./docs/reference/package-contract.md) — package.json contract
- [docs/engineering/testing.md](./docs/engineering/testing.md) — testing conventions

## License

[MIT](./LICENSE.md). This package is derived from [Rettiwt-API](https://github.com/Rishikant181/Rettiwt-API) (MIT) and [react-tweet](https://github.com/vercel/react-tweet) (MIT); the original copyright notices are retained in [NOTICE.md](./NOTICE.md).
