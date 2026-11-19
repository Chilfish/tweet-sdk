# CI

流水线定义在 `.github/workflows/ci.yml`。

## 结构

| job | 触发 | 内容 |
|---|---|---|
| `check` | push main / PR | typecheck、lint:check、test:coverage、build、产物与文档校验、示例运行；上传 `dist` 与 `coverage` artifact |
| `runtime` | push main / PR | 依赖 `check`，下载 `dist` artifact，在 Node 20/22/24 下分别以 ESM 与 CJS 导入验证 |

## Node 版本

构建工具（tsdown / TypeScript 工具链）要求 Node ≥22，而库本身支持 Node ≥20。因此：

- **构建只在 `check` job（Node 24）执行一次**。
- `runtime` job 不安装依赖、不构建，只消费 `dist` artifact。
- 这样 Node 20 验证的是「产物能否运行」，而不是「工具链能否构建」。

## 约定

- **权限最小化**：`permissions: contents: read`。
- **并发取消**：同 ref 的新跑会取消旧跑（`cancel-in-progress: true`）。
- **锁文件**：`bun install --frozen-lockfile`，manifest 与 `bun.lock` 不一致直接失败。
- **版本一致**：`packageManager`、CI 的 `bun-version`、README 中的版本必须同步。
- **门禁不跳过**：任何一步失败都视为红灯，不使用 `continue-on-error`。

## 缓存

`oven-sh/setup-bun@v2` 自带依赖缓存，无需额外 `actions/cache`。不要在 CI 中提交 `node_modules`。

## 排障

| 报错 | 原因 | 处理 |
|---|---|---|
| `lockfile had changes` | `bun.lock` 未更新 | 本地 `bun install` 并提交锁文件 |
| `Cannot find module 'dist/index.js'` | 未先构建 | 检查步骤顺序，build 在导入验证之前 |
| `eslint` 仅 CI 失败 | 本地用 `lint` 自动修复过 | 提交前跑 `bun run lint:check` |
| 覆盖率下降 | 新增代码无测试 | 补测试，不要下调阈值 |

## 修改 workflow 时

1. 确认 action 版本真实存在（`checkout@v4`、`setup-bun@v2`、`setup-node@v4`）。
2. 发布相关改动同步 [build-and-release](./build-and-release.md)。
3. 新增门禁时同步 [release-checklist](./release-checklist.md)。
