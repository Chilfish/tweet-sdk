# 公开 API

`src/index.ts` 是唯一对外承诺的入口；`src/node.ts` 是 `./node` 子路径入口；`src/lib/**` 的内部路径不属于公开 API。

## 入口

| 入口 | 产物 | 运行时 |
|---|---|---|
| `@chilfish/tweet` | `dist/index.js` / `dist/index.cjs` | 平台无关（fetch 即可） |
| `@chilfish/tweet/node` | `dist/node.js` / `dist/node.cjs` | Node 20+（`node:fs`、undici dispatcher） |
| `@chilfish/tweet/react` | 待 Phase 3 | 浏览器 |

两个入口的 ESM / CJS 公开面一致，类型声明分别为 `index.d.ts` / `index.d.cts`（`node.d.ts` / `node.d.cts`）。

## core 导出面

### 取数

| 导出 | 说明 |
|---|---|
| `TwitterClient` | 门面：`getTweet` / `getReplies` / `searchTweets` / `getUser` / `getUserTimeline` / `getListTweets` / `getSpace` / `run` |
| `parseSearchTimeline` | 纯函数：`SearchTimeline` 响应 → 推文列表 + 下一页光标 |
| `RettiwtPool` | 多 Key 轮询池（冷却 / 退避 / 负载均衡） |
| `RettiwtConfig` / `DefaultRettiwtHeaders` | 运行时配置 |
| `FetcherService` | 低层请求：`request(ResourceType, args)` |
| `TwitterAPIClient` | 原始取数组合层（pool + 资源类型） |
| `TweetEnrichmentService` | 批量富化助手 |
| `ResourceType` / `TweetRepliesSortType` / `BaseType` | 资源与排序枚举 |

### 传输与配置

| 导出 | 说明 |
|---|---|
| `HttpClient` / `HttpRequest` / `HttpResponse` | 中立传输契约 |
| `createFetchHttpClient` / `defaultHttpClient` | fetch 实现 |
| `IRettiwtConfig` | `apiKey` / `timeout` / `headers` / `delay` / `maxRetries` / `httpClient` / `tidProvider` |
| `TidProvider` / `TidContext` | 可注入的 transaction-id 提供者 |
| `buildXShellHeaders` / `isUsableXDocument` / `X_SHELL_URLS` | 默认 transaction-id 实现的探测规则 |

### 错误

| 导出 | status |
|---|---|
| `TwitterApiError` | 任意，基类，带 `status` / `code` / `resource` |
| `RateLimitError` | 429 |
| `AuthError` | 401 / 403 |
| `NotFoundError` | 404 |

### 解析与富化

| 导出 | 说明 |
|---|---|
| `enrichTweet` | `RawTweet` → `EnrichedTweet`（转推展开、实体、卡片、投票、文章、媒体） |
| `getEntities` / `getMediaAltEntities` / `serializeForAI` / `restoreEntities` / `applyAITranslations` | 实体切分与翻译载荷 |
| `mapTwitterCard` / `mapMediaDetails` / `mapPollCard` / `mapArticle` / `mapSpaceDetails` / `attachSpaceDetails` | 卡片类映射 |
| `resolveSpaceId` / `extractAudiospaceId` / `isSpaceUrl` / `resolveSpacePlaybackState` / `formatSpace*` | Space 判定与格式化 |
| `resolveArticleId` / `resolveArticleLink` / `isArticleUrl` / `parseContentState` | Article 判定与块解析 |
| `parseTrendingCard` | jetfuel payload → Trending 卡片 |
| `organizeTweets` | 线程/评论区组织 |
| `formatDate` | 时区格式化 |
| `normalizeMediaUrl` / `normalizeProfileImageUrl` | twimg 媒体/头像 URL 归一化 |

### 类型

`EnrichedTweet` / `EnrichedUser` / `RawTweet` / `RawUser` / `TweetData` / `Entity` / `MediaDetails` / `TweetPoll` / `TweetArticle` / `LinkPreviewCard` / `TrendingCardInfo` / `SpaceDetails` / `SpaceAvailability` 等，详见 `src/lib/types/enriched/`。

字段命名约定（0.1.0 起）：

- 推文 id：`id`（不是 `id_str`）
- 引用推文：`quotedTweet` / `quotedTweetId`
- 转推事件 id：`retweetedOriginalId`
- 内联媒体：`isInlineMedia`
- 回复指向：`in_reply_to_status_id_str`

## node 导出面

| 导出 | 说明 |
|---|---|
| `createNodeClient(options)` | 读 `TWEET_KEYS` / `http_proxy`，返回 `TwitterClient` |
| `createProxyFetch(proxy)` | 基于 undici `ProxyAgent` 的 `HttpClient`（`http(s)://`） |
| `readMediaFile(path)` | 读文件为 `Blob`，供 `tweet.upload` 使用 |
| `CreateNodeClientOptions` | `keys` / `cookie` / `proxy` / `timeout` / `maxRetries` / `headers` / `logger` |

## 契约

- 只提供具名导出，没有默认导出。
- 新增/删除导出属于公开契约变更：同步 `tests/exports.test.ts`、本文与 `CHANGELOG.md`。
- `package.json#exports` 决定发布面，构建过程不得改写。
