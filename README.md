# tweet-sdk

> 现代 TypeScript 库脚手架：tsdown 构建、Vitest 测试、ESLint 统一风格、Bun 安装、OIDC 一键发布。

[![CI](https://github.com/Chilfish/tweet-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Chilfish/tweet-sdk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/tweet-sdk.svg)](https://www.npmjs.com/package/tweet-sdk)
[![License](https://img.shields.io/github/license/Chilfish/tweet-sdk.svg)](./LICENSE.md)

## 特性

- **双格式产物** — 同时产出 ESM（`dist/index.js`）与 CJS（`dist/index.cjs`），各自带独立类型声明。
- **零运行时依赖** — `dependencies` 为空，工具链全部留在 `devDependencies`。
- **严格类型** — `strict` + `verbatimModuleSyntax`，强制 `import type` / `export type`。
- **格式化即 lint** — antfu ESLint 配置接管格式化，不需要 Prettier。
- **提交即校验** — `lefthook` 在 pre-commit 对暂存文件执行 `eslint --fix`，pre-push 跑构建。
- **发布即门禁** — tag 触发 CI，校验版本与 CHANGELOG 后通过 OIDC 发布并附带 provenance。
- **自带门禁脚本** — 产物校验、tag 校验、文档链接与索引校验。
- **文档体系完整** — 指南、工程规范、API 契约、事故复盘模板、开发日志。

## 环境要求

| 工具 | 版本 |
|---|---|
| Bun | 1.4.4+ |
| Node.js | 20+ |

## 安装

```bash
bun install
```

## 快速开始

```ts
import { one, two } from 'tweet-sdk'

console.log(one + two)
```

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
src/                 # 库源码，唯一公开入口 src/index.ts
tests/               # 测试，目录镜像 src/
examples/            # 可运行示例
scripts/             # 门禁与发布脚本
docs/                # 内部文档（指南、工程规范、复盘）
.github/             # CI、发布、issue/PR 模板、dependabot
tsdown.config.ts     # 构建配置
vitest.config.ts     # 测试与覆盖率配置
eslint.config.js     # 代码风格与格式化
lefthook.yml         # Git hooks
```

## 发布流程

1. 在 `CHANGELOG.md` 的 `## Unreleased` 写清本次变化。
2. 运行 `bun run release`，`bumpp` 会升级版本、提交、打 tag 并推送。
3. 推送的 `v*` tag 触发 `publish.yml`：校验 tag 与 `package.json`、CHANGELOG 版本节、全量门禁，然后 `npm publish --provenance`。
4. 发布后在 npm 包设置里配置 Trusted Publisher（GitHub Actions）。

详见 [docs/engineering/build-and-release.md](./docs/engineering/build-and-release.md) 与 [发版检查表](./docs/engineering/release-checklist.md)。

## 文档

- [docs/README.md](./docs/README.md) — 文档索引与「何时阅读」
- [docs/guide/getting-started.md](./docs/guide/getting-started.md) — 初始化与改造
- [docs/engineering/architecture.md](./docs/engineering/architecture.md) — 架构与分层
- [docs/engineering/code-style.md](./docs/engineering/code-style.md) — 代码风格
- [docs/engineering/testing.md](./docs/engineering/testing.md) — 测试规范
- [docs/reference/package-contract.md](./docs/reference/package-contract.md) — package.json 契约

## 贡献

见 [CONTRIBUTING.md](./CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。安全问题请走 [SECURITY.md](./SECURITY.md)。

## 许可证

[MIT](./LICENSE.md)
