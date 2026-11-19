# 快速开始

## 环境要求

| 工具 | 版本 | 用途 |
|---|---|---|
| Bun | 1.4.4+ | 安装依赖、运行脚本、本地开发 |
| Node.js | 20+ | 运行时（`engines.node`）；`./node` 入口 |
| Git | 2.4+ | lefthook hooks |

Bun 版本锁定在 `package.json#packageManager`，CI 使用同版本。

## 初始化

```bash
git clone git@github.com:Chilfish/tweet-sdk.git
cd tweet-sdk
bun install
```

`bun install` 会自动执行 `prepare: lefthook install`，安装 Git hooks。

## 消费者用法

```bash
bun add @chilfish/tweet
```

```ts
import { enrichTweet, TwitterClient } from '@chilfish/tweet'

const client = new TwitterClient(process.env.TWEET_KEYS!)
const tweet = enrichTweet(await client.getTweet('<tweet-id>'))

console.log(tweet?.text)
```

Node 下的便捷工厂与文件上传：

```ts
import { createNodeClient, readMediaFile } from '@chilfish/tweet/node'

const client = createNodeClient()
const media = await readMediaFile('photo.jpg')
```

## 第一条命令

```bash
bun run check
```

它依次执行 typecheck、lint、测试覆盖率、构建、产物校验。全绿即表示可以发布。

## 下一步

- 日常命令与发布流程：[usage.md](./usage.md)
- 公开 API：[api.md](../reference/api.md)
- 架构与目录约定：[architecture.md](../engineering/architecture.md)
- 代码风格：[code-style.md](../engineering/code-style.md)
