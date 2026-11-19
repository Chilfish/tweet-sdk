# 构建与发布

## 构建

工具：**tsdown**（rolldown 内核），配置见 `tsdown.config.ts`。

| 项 | 取值 | 理由 |
|---|---|---|
| `entry` | `src/index.ts` | 单入口，子路径入口需显式追加 |
| `format` | `esm` + `cjs` | 同时兼容 `import` 与 `require` |
| `dts` | `true` | 生成 `index.d.ts` / `index.d.cts` |
| `platform` | `neutral` | 不绑定 Node，浏览器/Edge 可消费 |
| `target` | `es2022` | 现代语法，避免过度降级 |
| `neverBundle` | `/^node:/` | neutral 平台不解析 Node 内置模块 |
| `exports` | `false` | `package.json#exports` 手工维护，构建不得改写 |

产物契约：

```
dist/index.js      ESM
dist/index.cjs     CJS
dist/index.d.ts    ESM 类型
dist/index.d.cts   CJS 类型
```

CI 会在 build 后校验这四个文件存在，并分别在 Node 20/22/24 下导入验证；`bun run verify:package` 还会检查 tarball 文件清单，确保源码、测试、脚本不会被打进发布包。

## package.json 契约

- `exports["."]` 必须是 `import` / `require` 各自带 `types` 的条件对象。
- `files` 只包含 `dist`、`LICENSE.md`、`README.md`。
- `sideEffects: false`，保证 tree-shaking。
- `engines.node` 与 CI 矩阵下限保持一致。
- `publishConfig.provenance: true`，发布时附带来源证明。

`tests/exports.test.ts` 锁定上述形状，改动导出面必须先改测试。

## 发布链路

1. 更新 `CHANGELOG.md` 的 `## Unreleased`，写清本版变化。
2. `bun run release` → `bumpp` 升级版本、提交、打 tag、推送。
3. tag 推送触发 `.github/workflows/publish.yml`：
   - 校验 tag 与 `package.json#version` 一致
   - 校验 `CHANGELOG.md` 存在 `## <version>` 节
   - typecheck / lint:check / test / build
   - `npm publish --provenance --access public`
4. 发布后再创建 GitHub Release（可复用 CHANGELOG 该节作为 notes）。

## 认证

使用 **npm Trusted Publisher（OIDC）**，不配置 `NPM_TOKEN`：

- workflow 需要 `permissions.id-token: write`。
- `setup-node` 刻意**不设置** `registry-url`，避免写入占位 token 的 `.npmrc`。
- 首次发布前在 npm 包设置中绑定本仓库与本 workflow。

## 禁止

- 本地直接 `npm publish`（绕过门禁）。
- 在 `tsdown.config.ts` 中开启 `exports: true`（会改写手工维护的 exports）。
- 发布前不更新 CHANGELOG（CI 会直接失败）。
