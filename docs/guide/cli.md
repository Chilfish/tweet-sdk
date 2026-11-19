# 命令行

`@chilfish/tweet` 提供 `tweet-cli`（`bin`）与 `./cli` 子路径。CLI 只依赖 `./node` 能力，需要 Node 20+。

## 安装与运行

```bash
# 全局
bun add -g @chilfish/tweet

# 或直接运行
bunx @chilfish/tweet tweet get <id>
npx @chilfish/tweet tweet get <id>
```

本地开发时用仓库脚本：

```bash
bun run cli --help
```

## 认证

| 来源 | 说明 |
|---|---|
| `--keys/-k` | 逗号分隔的 base64 cookie（即 `TWEET_KEYS` 的单项） |
| `--cookie` | 原始 `k=v; k=v` Cookie 串，CLI 自动 base64 编码 |
| `--env-file` | `.env` 路径（默认 `<pwd>/.env`），读取 `TWEET_KEYS` / `http_proxy` |
| `--proxy/-p` | HTTP(S) 代理，覆盖 env 文件 |
| `--verbose/-v` | 把 pool 轮换 / 解析回退事件以 JSON 行写到 stderr |

优先级：`--keys` → `--cookie` → `--env-file` 的 `TWEET_KEYS`。都没有时按访客身份请求（仅公开数据）。

## 命令

```
tweet-cli
├── tweet get <id>                     单条推文（默认富化，--raw 输出原始）
├── tweet replies <id>                 回复 + nextCursor
├── tweet search <query>               搜索（支持 from: / since: / min_faves: 等）
├── user get <id|username>             用户资料
├── user timeline <id>                 用户时间线（帖子 + 回复）
├── space get <id>                     Space 元数据（已删除 → unavailable）
├── list tweets <id>                   列表推文
└── media download <id> -o <dir>       下载图片原图 / 最高码率 mp4
```

## 输出契约

- 查询命令默认 JSON（2 空格缩进），`--format markdown`（`-f md`）输出人读视图。
- 错误统一输出到 **stderr** 的 JSON 信封，退出码非 0：

```json
{
  "event": "error",
  "code": "CONFIG_INVALID",
  "message": "Unknown option --raww for tweet-cli tweet get. Did you mean --raw?",
  "context": { "field": "raww", "suggestion": "raw" }
}
```

- `media download` 是流式命令，stdout 输出 NDJSON 事件：`item`（`planned` / `downloaded` / `failed`）与 `done` 汇总；任一失败时退出码为 1。

## 未知参数

citty 默认静默忽略未知 flag，脚本里 `--formt` 这种拼写错误很难发现。CLI 在 `runMain` 之前校验一次：

- 未知 flag 直接报错，并给出最接近的候选；
- 参数写在子命令之前（citty 同样会忽略）时，提示把它写到子命令之后。

## 帮助

`--help` 按终端显示宽度对齐（CJK 记 2 列），多行 description 拆成续行；`NO_COLOR=1` / `CI` / `TERM=dumb` 下自动关闭颜色。

## 示例

```bash
# 读取原始推文并富化，人读视图
tweet-cli tweet get 1968314084207788302 -f md

# 搜索最新日语推文
tweet-cli tweet search '#ゆめみた' --type latest --count 20

# 翻页
tweet-cli tweet replies 1968314084207788302 --cursor <nextCursor>

# 下载媒体到 ./out
tweet-cli media download 1968314084207788302 -o out --concurrency 4
```
