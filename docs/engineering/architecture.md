# 架构

## 目标

X（Twitter）取数与推文富化的 SDK。core 平台无关，Node 与 UI 能力分别落在 `./node` 与 `./react` 子路径，站点只做装配。

## 分层

```
src/index.ts            core 公开入口（barrel，只做 re-export）
src/node.ts             ./node 公开入口
src/lib/
  http/                 传输契约与 fetch 实现（无平台依赖）
  transaction.ts        x-client-transaction-id（可注入 provider）
  errors.ts             类型化错误
  pool/                 RettiwtPool（冷却 / 退避 / 负载均衡）
  client.ts             TwitterClient 门面
  collections/          Groups / Requests / Extractors
  enums/                ResourceType 等
  models/               请求参数、认证、数据模型
  requests/             HTTP 请求描述符（返回 HttpRequest）
  services/             FetcherService 与高层服务
  parse/                纯函数解析与富化
  types/                raw（上游形态）与 enriched（对外契约）
  media-url.ts          媒体 URL 归一化
src/node/               Node 适配实现
tests/                  测试，目录镜像 src/
docs/                   内部文档
```

依赖方向严格单向：

```
index.ts / node.ts  →  client / pool / parse  →  services  →  requests / collections  →  types
```

- 解析层（`parse/`）不依赖 `services/`，也不做 IO；需要上游数据时由调用方注入（如 `attachSpaceDetails` 的 `fetchSpace`）。
- `helpers` 只保留纯工具（`JsonUtils`）。
- `src/index.ts` / `src/node.ts` 是唯一对外承诺的入口；`src/lib/**` 内部路径不属于公开 API。

## 公开面

- 只使用具名导出，禁止 `export default`。
- 类型与值分开导出：`export type { ... }` / `export { ... }`。
- `package.json#exports` 决定发布面，`tests/exports.test.ts` 锁定其形状。
- 新增导出视为公开契约变化，必须更新 CHANGELOG、[api.md](../reference/api.md) 与 `tests/exports.test.ts`。

## 传输层

`HttpClient` 是唯一传输契约：

```ts
interface HttpClient {
  request: <T>(req: HttpRequest) => Promise<HttpResponse<T>>
}
```

- 默认实现用全局 `fetch`，`AbortSignal.timeout` 处理超时。
- 请求描述符（`requests/*`）只描述 `method` / `url` / `params` / `data` / `headers`，不绑定任何客户端。
- 代理、文件读取、`proxy dispatcher` 等平台能力只出现在 `src/node/`。
- transaction id 通过 `TidProvider` 注入：默认实现抓取 X 页面壳，受限运行时（如无法解析 HTML）可换成静态实现。

## 平台无关

构建目标为 `platform: 'neutral'`，不内联 Node 内置模块：

- 源码里可以 `import type` 引用 `node:*` 类型。
- core 代码不得有运行时 `node:*` 导入；确需 Node 能力时放到 `./node` 入口。
- 运行时依赖只有 `linkedom` / `x-client-transaction-id`（core，纯 JS）与 `undici`（`./node`，懒加载）。

## 扩展方式

| 需求 | 做法 |
|---|---|
| 增加端点 | `requests/<domain>.ts` 新增描述符 → `collections/Requests.ts` 注册 → `enums/Resource.ts` 加资源 → `collections/Groups.ts` 分类 |
| 增加子路径入口 | 新增 `src/<name>.ts`，在 tsdown `entry` 与 `package.json#exports` 同步声明 |
| 增加平台能力 | 放在 `src/node/` 或新的子路径入口，core 只接受注入 |
| 引入运行时依赖 | 同步评估 ESM/CJS 双格式、tree-shaking、`sideEffects` 与平台归属 |
| 拆分多包 | 迁移到 workspace，并把版本集中到 catalog |
