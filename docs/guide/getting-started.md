# 快速开始

## 环境要求

| 工具 | 版本 | 用途 |
|---|---|---|
| Bun | 1.4.4+ | 安装依赖、运行脚本、本地开发 |
| Node.js | 20+ | 运行时（`engines.node`） |
| Git | 2.4+ | lefthook hooks |

Bun 版本锁定在 `package.json#packageManager`，CI 使用同版本。

## 初始化

```bash
git clone git@github.com:Chilfish/tweet-sdk.git my-lib
cd my-lib
bun install
```

`bun install` 会自动执行 `prepare: lefthook install`，安装 Git hooks。

## 改成你的项目

1. 修改 `package.json`：`name`、`description`、`repository`、`homepage`、`bugs`、`keywords`。
2. 修改 `README.md` 标题与安装命令。
3. 替换 `src/index.ts` 的占位导出，并同步 `tests/index.test.ts`。
4. 更新 `LICENSE.md` 的版权信息。
5. 更新 `CHANGELOG.md`，清空模板内容。
6. npm 上创建包并配置 Trusted Publisher（见 [build-and-release](../engineering/build-and-release.md)）。

## 第一条命令

```bash
bun run check
```

它依次执行 typecheck、lint、测试覆盖率、构建、产物校验。全绿即表示脚手架可用。

## 下一步

- 日常命令与发布流程：[usage.md](./usage.md)
- 架构与目录约定：[architecture.md](../engineering/architecture.md)
- 代码风格：[code-style.md](../engineering/code-style.md)
