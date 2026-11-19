# Git 工作流

## 分支

- `main` 为唯一长期分支，始终可发布。
- 功能与修复使用短生命周期分支：`feat/<scope>`、`fix/<scope>`。
- 合并前必须 rebase 到最新 `main`，保持线性历史。

## 提交信息

Conventional Commits，格式：

```
type(scope): 简短中文摘要
```

常用 type：

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修复 |
| `refactor` | 重构，不改行为 |
| `test` | 测试 |
| `docs` | 文档 |
| `build` | 构建/依赖 |
| `ci` | 流水线 |
| `chore` | 杂项 |

- 一个逻辑单元一个提交，不攒到最后。
- 大改动按模块或文件拆成 3–4 个提交。
- 不写「修复 bug」这类无法定位的摘要；写清对象与行为。

## Git hooks（lefthook）

配置见 `lefthook.yml`，`bun install` 时通过 `prepare: lefthook install` 安装。

| 钩子 | 行为 |
|---|---|
| pre-commit | 对暂存文件运行 `eslint --fix`，自动回写暂存区 |
| pre-push | 运行 `bun run build` |

- 不推荐 `--no-verify`；确实需要时在 PR 说明原因。
- 完整门禁（typecheck / test / coverage）在 CI 执行，hooks 只负责快速反馈。

## PR

- 标题遵循提交信息格式。
- 描述包含：动机、行为变化、验证方式。
- 公开契约变化必须同时更新 `CHANGELOG.md` 与相关文档。
- diff 超过 10 个文件或 200 行时，说明拆分理由或拆分提交。
