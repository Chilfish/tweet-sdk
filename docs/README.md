# 文档索引

本目录是项目的唯一文档入口。**新增文档必须在下表登记一行**，`bun run check:docs` 会强制校验。

## 三类必写文档

只有以下改动强制先写文档，其余改动当天补 [development-log](./development-log/README.md)：

1. 公开契约变化（导出面、类型、行为语义）
2. 新增或修改构建/发布流程
3. 事故与可靠性修复（写入 [postmortem](./postmortem/README.md)）

## 使用指南

| 文档 | 说明 | 何时阅读 |
|---|---|---|
| [guide/getting-started.md](./guide/getting-started.md) | 安装、初始化、第一条命令 | 第一次接触本项目 |
| [guide/usage.md](./guide/usage.md) | 日常开发、发布、常见操作 | 日常开发 |

## 工程规范

| 文档 | 说明 | 何时阅读 |
|---|---|---|
| [engineering/architecture.md](./engineering/architecture.md) | 分层、依赖方向、公开面边界 | 新增模块或调整目录前 |
| [engineering/code-style.md](./engineering/code-style.md) | 命名、导入顺序、类型与错误处理 | 每次写代码 |
| [engineering/testing.md](./engineering/testing.md) | 测试分层、命名、覆盖率 | 新增功能或修 bug 时 |
| [engineering/build-and-release.md](./engineering/build-and-release.md) | 双格式构建、产物契约、发布链路 | 改构建配置或发布时 |
| [engineering/ci.md](./engineering/ci.md) | 流水线结构、缓存、门禁与排障 | 改 workflow 或 CI 失败时 |
| [engineering/dependencies.md](./engineering/dependencies.md) | 依赖策略、锁文件、升级流程 | 增删依赖或升级版本 |
| [engineering/security.md](./engineering/security.md) | 供应链、密钥、OIDC、漏洞响应 | 涉及密钥、发布或安全问题时 |
| [engineering/git-workflow.md](./engineering/git-workflow.md) | 分支、提交信息、hooks、PR 规范 | 提交前 |
| [engineering/release-checklist.md](./engineering/release-checklist.md) | 发版逐项检查表 | 每次发版 |

## 参考

| 文档 | 说明 |
|---|---|
| [reference/api.md](./reference/api.md) | 公开 API 与导出面说明 |
| [reference/package-contract.md](./reference/package-contract.md) | `package.json` 字段契约 |

## 事故复盘

| 文档 | 说明 |
|---|---|
| [postmortem/README.md](./postmortem/README.md) | 复盘索引与高频雷区自查清单 |
| [postmortem/TEMPLATE.md](./postmortem/TEMPLATE.md) | 新复盘模板 |

## 开发日志与归档

| 文档 | 说明 |
|---|---|
| [development-log/README.md](./development-log/README.md) | 按日期记录的开发日志规范 |
| [archive/README.md](./archive/README.md) | 已失效文档的归档区 |

## 约定

- **文档即事实**：路径、命令、字段必须与当前代码一致；发现过时就地修正。
- **文档先行**：仅限上文「三类必写文档」，其余不设流程门槛。
- **归档制**：失效文档移入 `archive/`，不留在主目录误导读者。
- 新增文档未在索引登记、或链接失效时，`bun run check:docs` 会失败。
