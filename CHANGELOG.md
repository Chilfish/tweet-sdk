# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [SemVer](https://semver.org/lang/zh-CN/)。

## Unreleased

### 变更

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
