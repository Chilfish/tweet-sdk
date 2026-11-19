# Getting Started

## Requirements

| Tool | Version | Purpose |
|---|---|---|
| Bun | 1.4.4+ | Install dependencies, run scripts, local development |
| Node.js | 20+ | Runtime (`engines.node`); `./node` entry |
| Git | 2.4+ | lefthook hooks |

The Bun version is pinned in `package.json#packageManager`, and CI uses the same version.

## Setup

```bash
git clone git@github.com:Chilfish/tweet-sdk.git
cd tweet-sdk
bun install
```

`bun install` automatically runs `prepare: lefthook install`, which installs the Git hooks.

## Using the package as a consumer

```bash
bun add @chilfish/tweet
```

```ts
import { enrichTweet, TwitterClient } from '@chilfish/tweet'

const client = new TwitterClient(process.env.TWEET_KEYS!)
const tweet = enrichTweet(await client.getTweet('<tweet-id>'))

console.log(tweet?.text)
```

Convenience factory and file upload on Node:

```ts
import { createNodeClient, readMediaFile } from '@chilfish/tweet/node'

const client = createNodeClient()
const media = await readMediaFile('photo.jpg')
```

## Your first command

```bash
bun run check
```

It runs typecheck, lint, test coverage, build and artifact verification in that order. All green means the package is ready to publish.

## Next steps

- Day-to-day commands and the release process: [usage.md](./usage.md)
- Public API: [api.md](../reference/api.md)
- Architecture and directory conventions: [architecture.md](../engineering/architecture.md)
- Code style: [code-style.md](../engineering/code-style.md)
