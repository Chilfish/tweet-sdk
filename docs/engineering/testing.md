# 测试

## 分层

| 层 | 位置 | 依赖 | 内容 |
|---|---|---|---|
| 单元 | `tests/http/`、`tests/pool/`、`tests/parse/`、`tests/cli/` | 无 IO | 纯函数、解析、传输替换、CLI 参数与规划 |
| 契约 | `tests/exports.test.ts` | 文件系统 | `package.json` 导出面、files、engines、bin |
| 集成 | `tests/integration/` | 真实 key | `describe.skipIf` 守卫，默认跳过 |

目录镜像 `src/` 结构：`tests/parse/poll.test.ts` 对应 `src/lib/parse/poll.ts`。

## 命名

- 文件 `*.test.ts`，集成测试可用 `*.e2e.test.ts`。
- 用例名描述行为与结果：`returns null for empty input`、`throws when status is not ok`。
- 一个文件内按主题分 `describe`。

## 工具

- Vitest，`globals: true`，显式 import 也合法，但同仓保持一致。
- 共享替身与 fixture 加载器放在 `tests/helpers/`，各文件内的更强 fake 就地定义。
- 用工厂函数构造被测对象，避免 `beforeEach` 共享可变状态。
- 传输层测试注入 `createFetchHttpClient({ fetch })`，不访问网络；Pool 测试注入 `createFetcher`。

## 集成用例

`tests/integration/live.test.ts` 默认跳过，提供环境变量后运行：

```bash
TWEET_KEYS=<base64 cookie> TWEET_TEST_ID=<tweet-id> bun run test
# 可选
TWEET_TEST_SPACE_ID=<space-id> TWEET_TEST_USER=<username>
```

断言只覆盖契约形状（id / 字段存在性 / cursor 类型），不写死上游文案。

## 覆盖率

`bun run test:coverage` 使用 v8，报告 `text-summary` / `json-summary` / `lcov`，输出到 `coverage/`。

- 覆盖率阈值是棘轮：只允许上调，不允许为了过 CI 下调。
- 新增逻辑必须带测试；修 bug 必须先补能复现的用例。

## 禁止

- 测试之间共享可变状态。
- 依赖真实网络或真实时间的单元测试。
- `expect(true).toBe(true)` 之类的空断言。
