# @chilfish/tweet

> X（Twitter）取数与推文富化 SDK：平台无关核心、Node 适配与 React 组件。

[![CI](https://github.com/Chilfish/tweet-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Chilfish/tweet-sdk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@chilfish/tweet.svg)](https://www.npmjs.com/package/@chilfish/tweet)
[![License](https://img.shields.io/github/license/Chilfish/tweet-sdk.svg)](./LICENSE.md)

## 特性

- **平台无关核心** — 传输层是可注入的 `HttpClient`，默认走 `fetch`；Workers / Deno / Bun / 浏览器 / Node 共用同一份实现。
- **多入口单包** — `.`（core）、`./node`（proxy 与文件上传）、`./react`（组件，Phase 3）互相独立。
- **类型化错误** — `TwitterApiError` / `RateLimitError` / `AuthError` / `NotFoundError`，Pool 直接读 `status` 分类。
- **多 Key 轮询池** — per-key 冷却、指数退避、`inFlight` 负载均衡、可注入分类器与日志。
- **解析即契约** — `enrichTweet` 产出的 `EnrichedTweet` 是 core 与 UI 之间唯一的契约。
- **双格式产物** — ESM / CJS 各自带独立类型声明，`sideEffects: false`。
- **严格类型** — `strict` + `verbatimModuleSyntax`，强制 `import type` / `export type`。

## 环境要求

| 工具 | 版本 |
|---|---|
| Bun | 1.4.4+ |
| Node.js | 20+（仅 `./node` 入口需要） |

## 安装

```bash
bun add @chilfish/tweet
```

## 快速开始

```ts
import { enrichTweet, TwitterClient } from '@chilfish/tweet'

const client = new TwitterClient(process.env.TWEET_KEYS!)
const raw = await client.getTweet('1968314084207788302')
const tweet = enrichTweet(raw)

console.log(tweet?.text, tweet?.mediaDetails?.length)
```

Node 下用 `./node` 的便捷工厂（读取 `TWEET_KEYS` / `http_proxy`、支持文件上传）：

```ts
import { createNodeClient, readMediaFile } from '@chilfish/tweet/node'

const client = createNodeClient({ proxy: 'http://127.0.0.1:7890' })
await client.run(fetcher => fetcher.request('MEDIA_UPLOAD_APPEND', {
  upload: { id, media: await readMediaFile('photo.jpg') },
}))
```

## 入口

| 入口 | 内容 | 运行时 |
|---|---|---|
| `@chilfish/tweet` | transport / requests / auth / pool / parse / types | 平台无关 |
| `@chilfish/tweet/node` | proxy dispatcher、`readMediaFile`、`createNodeClient` | Node 20+ |
| `@chilfish/tweet/react` | 推文展示组件（Phase 3，尚未发布） | 浏览器 |

## 命令

| 命令 | 说明 |
|---|---|
| `bun run dev` | tsdown watch 构建 |
| `bun run build` | 构建 ESM + CJS + 类型声明 |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint 自动修复 |
| `bun run lint:check` | ESLint 只检查 |
| `bun run test` | 单次运行测试 |
| `bun run test:coverage` | 带 v8 覆盖率 |
| `bun run check` | 全量门禁（类型 + lint + 测试 + 构建 + 产物校验） |
| `bun run check:docs` | 文档链接与索引校验 |
| `bun run example` | 运行示例 |
| `bun run verify:package` | 校验发布产物 |
| `bun run release` | 升级版本、提交、打 tag、推送 |

## 目录结构

```
src/
  index.ts                    # core 公开入口
  node.ts                     # ./node 入口
  lib/
    http/                     # HttpClient + fetch 实现 + 编码工具
    transaction.ts            # x-client-transaction-id 获取
    errors.ts                 # 类型化错误
    pool/                     # RettiwtPool
    client.ts                 # TwitterClient 门面
    collections/ enums/ models/ requests/ services/   # 取数层（自 Rettiwt-API 派生）
    parse/                    # enrich / entities / poll / space / article / jetfuel
    types/                    # raw + enriched 类型
    media-url.ts
  node/                       # Node 适配实现
tests/                        # 单元测试，镜像 src/
examples/                     # 可运行示例
docs/                         # 内部文档
scripts/                      # 门禁与发布脚本
```

## 发布流程

1. 在 `CHANGELOG.md` 的 `## Unreleased` 写清本次变化。
2. 运行 `bun run release`，`bumpp` 会升级版本、提交、打 tag 并推送。
3. 推送的 `v*` tag 触发 `publish.yml`：校验 tag 与 `package.json`、CHANGELOG 版本节、全量门禁，然后 `npm publish --provenance`。

详见 [docs/engineering/build-and-release.md](./docs/engineering/build-and-release.md) 与 [发版检查表](./docs/engineering/release-checklist.md)。

## 文档

- [docs/README.md](./docs/README.md) — 文档索引与「何时阅读」
- [docs/reference/api.md](./docs/reference/api.md) — 公开 API 与导出面
- [docs/engineering/architecture.md](./docs/engineering/architecture.md) — 架构与分层
- [docs/reference/package-contract.md](./docs/reference/package-contract.md) — package.json 契约
- [docs/engineering/testing.md](./docs/engineering/testing.md) — 测试规范

## 许可证

[MIT](./LICENSE.md)。本包派生自 [Rettiwt-API](https://github.com/Rishikant181/Rettiwt-API)（MIT）与 [react-tweet](https://github.com/vercel/react-tweet)（MIT），原始版权声明保留在 [NOTICE.md](./NOTICE.md)。
