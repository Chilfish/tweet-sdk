# package.json 契约

`package.json` 是发布产物的唯一事实来源，构建过程不得改写发布字段。

## 必填字段

| 字段 | 当前值 | 约束 |
|---|---|---|
| `name` | `@chilfish/tweet` | 需要与 npm 包名一致 |
| `type` | `module` | 源码与 ESM 产物均按 ESM 解析 |
| `packageManager` | `bun@1.4.4` | 必须与 CI 的 bun 版本一致 |
| `sideEffects` | `false` | 保证 tree-shaking |
| `files` | `dist` / `LICENSE.md` / `NOTICE.md` / `README.md` | 只发布产物、文档与上游声明 |
| `engines.node` | `>=20` | 与 CI 运行时矩阵下限一致 |
| `publishConfig` | `access: public`、`provenance: true` | 通过 OIDC 发布并附带来源证明 |

## exports

```json
{
  ".": {
    "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
  },
  "./node": {
    "import": { "types": "./dist/node.d.ts", "default": "./dist/node.js" },
    "require": { "types": "./dist/node.d.cts", "default": "./dist/node.cjs" }
  },
  "./package.json": "./package.json"
}
```

规则：

- `types` 必须位于各自条件分支内、且在 `default` 之前。
- 不允许裸字符串导出（例如 `".": "./dist/index.js"`）。
- 每个目标文件必须真实存在，`bun run verify:package` 会校验。
- 新增子路径时同步 `tests/exports.test.ts` 与 `tsdown.config.ts#entry`。
- `./node` 是唯一允许引入 `node:*` 的入口；core 构建失败即视为破坏 `platform: 'neutral'`。

## 顶层兼容字段

`main` / `module` / `types` 仅为兼容旧工具保留：

| 字段 | 值 |
|---|---|
| `main` | `./dist/index.cjs` |
| `module` | `./dist/index.js` |
| `types` | `./dist/index.d.ts` |

新代码应依赖 `exports`，不要依赖这三个字段。

## 依赖

运行时依赖只允许以下三个，且都必须是平台无关或仅由 `./node` 触达：

| 依赖 | 用途 | 触达入口 |
|---|---|---|
| `linkedom` | 解析 X 页面壳，生成 transaction id | core（纯 JS） |
| `x-client-transaction-id` | `x-client-transaction-id` 头计算 | core（纯 JS） |
| `undici` | Node fetch 的 proxy dispatcher（`ProxyAgent`） | `./node` 懒加载 |

- 工具链全部放 `devDependencies`，版本使用 caret。
- 新增运行时依赖必须说明必要性、体积与替代方案，并同步本文。
- 修改依赖后必须提交更新后的 `bun.lock`。
- 策略详见 [dependencies](../engineering/dependencies.md)。

## 脚本

| 脚本 | 约定 |
|---|---|
| `build` | 只调用 `tsdown`，不做额外拷贝 |
| `check` | 汇总全量门禁，CI 与本地共用 |
| `prepublishOnly` | 只构建，防误发 |
| `release` | 只做版本升级与 tag，不在本地 publish |
