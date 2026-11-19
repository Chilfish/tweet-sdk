# 依赖

## 原则

- **零运行时依赖**：`dependencies` 必须为空。新增运行时依赖需要在 PR 中说明必要性、体积与替代方案。
- **工具链进 devDependencies**：构建、测试、lint、发布脚本全部视为开发依赖。
- **版本用 caret**：`^x.y.z`，锁定交给 `bun.lock`。
- **不手工编辑锁文件**。

## 分类

| 类别 | 位置 | 示例 |
|---|---|---|
| 运行时 | `dependencies` | 无 |
| 开发工具 | `devDependencies` | tsdown、vitest、eslint |
| 类型 | `devDependencies` | `@types/node`、`@types/bun` |

## 升级流程

```bash
bun outdated
bun update <pkg>
bun run check
git diff bun.lock
```

- 升级后必须跑 `bun run check` 与 `bun run check:docs`。
- 主版本升级需记录在 `CHANGELOG.md` 的「变更」或「升级提示」中。
- 升级失败时回退依赖，不要用 `--force` 绕过 peer 冲突。

## 新增依赖检查表

- [ ] 是否真的需要？能否用标准库或现有依赖实现？
- [ ] 许可证与项目兼容（MIT）？
- [ ] 是否支持 ESM？是否需要 CJS 产物？
- [ ] 是否引入 Node 内置模块？会破坏 `platform: 'neutral'`。
- [ ] 是否显著增大安装体积？
- [ ] 是否已加入 `devDependencies` 并更新 `bun.lock`？

## 自动升级

`.github/dependabot.yml` 每周检查 bun 生态依赖。Dependabot PR 必须通过全量 CI 才能合并。

`typescript` 当前忽略 `>=7`：`typescript-eslint` 尚未支持 TS 7，等上游支持后移除该 ignore。
