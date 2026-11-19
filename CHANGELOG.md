# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [SemVer](https://semver.org/lang/zh-CN/)。

## Unreleased

### 新增

- 包转型为 `@chilfish/tweet`：X 取数 + 推文富化 SDK，多入口单包（`.` core、`./node` Node 适配，`./react` 待 Phase 3）。
- 平台无关传输层：`HttpClient` / `HttpRequest` / `HttpResponse`，默认 `fetch` 实现，超时用 `AbortSignal.timeout`。
  `requests/*` 从 axios 配置改为中立请求描述符，`paramsSerializer` 由 `encodeQueryParams` 统一处理。
- 类型化错误：`TwitterApiError` / `RateLimitError` / `AuthError` / `NotFoundError`，替换 `TwitterError` 与 `ErrorService`。
- `RettiwtPool`：per-key 冷却、指数退避、`inFlight` 负载均衡，分类器 / fetcher 工厂 / logger 均可注入。
- 解析层进 core：`enrichTweet`、`getEntities`、`mapTwitterCard`、`mapPollCard`、`mapArticle`、`mapSpaceDetails`、`attachSpaceDetails`、`organizeTweets`、`parseTrendingCard`、`normalizeMediaUrl`。
- `TwitterClient` 门面：`getTweet` / `getReplies` / `searchTweets` / `getUser` / `getUserTimeline` / `getListTweets` / `getSpace`。
- `./node` 入口：`createNodeClient`（`TWEET_KEYS` / `http_proxy`）、`createProxyFetch`（undici `ProxyAgent`）、`readMediaFile`。
- 合并 anonTweet 能力：jetfuel Trending 卡、X Article 类型与块解析、guest 搜索放行、置顶推文 ID 列表。
- 测试迁移：Space / 投票 / 卡片 / transaction-id fixtures，新增 HTTP、Pool、enrich 与导出面契约测试。

### 变更

- `EnrichedTweet` 字段统一为 `id` / `quotedTweet` / `quotedTweetId` / `retweetedOriginalId` / `isInlineMedia`。
- 传输层去 axios：移除 `axios`、`cookiejar`、`form-data`、`node:querystring`、`node:https` Agent 依赖。
- 媒体上传改为 `Uint8Array | Blob`；文件读取由 `./node` 的 `readMediaFile` 负责。
- cookie 解析与 base64 编解码改为内置实现（`atob` / `btoa`），不再依赖 Node `Buffer`。
- 运行时依赖为 `linkedom`、`x-client-transaction-id`（core）与 `undici`（`./node`），均声明在 `neverBundle` 外置。
- 旧 `Rettiwt` 门面不再导出，低层控制请用 `FetcherService` + `ResourceType`。
- 新增 `NOTICE.md`，保留 Rettiwt-API（MIT，6.2.0）与 react-tweet（MIT）的原始版权。
- 构建工具从 unbuild 迁移到 tsdown，产出 ESM + CJS 双格式与独立类型声明。
- 包管理器从 pnpm 切换到 Bun，锁文件为 `bun.lock`。
- CI/发布流水线改用真实存在的 action 版本，发布走 OIDC + provenance。
- 使用 lefthook 接管 Git hooks：pre-commit 对暂存文件执行 `eslint --fix`，pre-push 构建。
- 修复 `exports` 条件类型、`engines`、`publishConfig` 等元数据。
- 测试迁移到 `tests/`，增加导出面契约测试与覆盖率配置。
- 新增 `docs/` 文档体系、`AGENTS.md`、`CHANGELOG.md`。
- 新增开箱即用基建：`examples/`、`scripts/verify-package.mjs`、`scripts/verify-release-tag.mjs`、`scripts/check-docs.mjs`。
- 新增社区文件：`CONTRIBUTING.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md`、Issue/PR 模板、`.editorconfig`、`.nvmrc`、Dependabot。
- CI 增加产物校验、文档校验、示例运行与覆盖率上传；发布增加 registry 轮询。

### 修复

- CI 的 Node 20 job 不再执行构建（tsdown 要求 Node ≥22），改为消费 `dist` artifact 验证运行时。
- Dependabot 忽略 `typescript >=7`，`typescript-eslint` 尚不支持该版本。
