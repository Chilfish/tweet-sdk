# 使用指南

## 日常命令

| 命令 | 作用 |
|---|---|
| `bun run dev` | tsdown watch，增量构建到 `dist/` |
| `bun run build` | 一次性构建 ESM + CJS + 类型声明 |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `eslint . --fix` |
| `bun run lint:check` | 只检查不修复（CI 用） |
| `bun run test` | 单次运行全部测试 |
| `bun run test:watch` | watch 模式 |
| `bun run test:coverage` | 带 v8 覆盖率 |
| `bun run example` | 运行 `examples/basic.ts` |
| `bun run check` | 全量门禁 |
| `bun run check:docs` | 校验文档链接与索引登记 |

## 写代码

```bash
# 新增一个模块
src/utils/id-codec.ts
tests/unit/utils/id-codec.test.ts
```

- 内部模块按 `src/<domain>/` 组织，`src/index.ts` 只做 re-export。
- 类型导入使用 `import type`。
- 新增导出要同步 `tests/exports.test.ts` 与 CHANGELOG。

## 提交

pre-commit 会对暂存文件跑 `eslint --fix`。提交信息格式见 [git-workflow](../engineering/git-workflow.md)：

```bash
git commit -m "feat(parser): 支持多值参数"
```

pre-push 会跑 `bun run build`，构建失败则阻止推送。

## 发布

```bash
# 1. 写 CHANGELOG 的 ## Unreleased
# 2. 一键发版
bun run release
```

完整流程与认证配置见 [build-and-release](../engineering/build-and-release.md)，逐项检查见 [release-checklist](../engineering/release-checklist.md)。

## 排障

| 现象 | 处理 |
|---|---|
| `bun install --frozen-lockfile` 失败 | 本地执行 `bun install` 更新 `bun.lock` 后提交 |
| pre-commit 没有执行 | `bunx lefthook install` 重新安装 hooks |
| `check-docs` 报未登记 | 在 `docs/README.md` 索引中补一行 |
| 发布 job 报版本不一致 | tag 与 `package.json#version` 不同，重打 tag |
| 产物缺少文件 | 先 `bun run build`，再 `bun run verify:package` |
