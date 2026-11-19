# 公开 API

当前脚手架只有占位 API，替换 `src/index.ts` 后请同步更新本文。

## 导出面

```ts
export const one = 1
export const two = 2
```

| 导出 | 类型 | 说明 |
|---|---|---|
| `one` | `1` | 占位常量 |
| `two` | `2` | 占位常量 |

## 入口

| 入口 | 产物 | 适用 |
|---|---|---|
| `import { one } from 'tweet-sdk'` | `dist/index.js` | ESM |
| `const { one } = require('tweet-sdk')` | `dist/index.cjs` | CJS |

两种入口的公开 API 完全一致，类型声明分别为 `index.d.ts` / `index.d.cts`。

## 契约

- 只提供具名导出，没有默认导出。
- 运行时零依赖，不访问网络、文件系统或全局状态。
- 导出面变化属于公开契约变更，必须：
  1. 更新本文件与 `README.md`
  2. 更新 `tests/exports.test.ts`
  3. 在 `CHANGELOG.md` 标注，破坏性变更需说明迁移方式

## 扩展子路径

新增 `./node` 这类入口时：

1. 增加 `src/node.ts`
2. 在 `tsdown.config.ts` 的 `entry` 中加入
3. 在 `package.json#exports` 中声明 `import` / `require` 各自带 `types`
4. 在 `tests/exports.test.ts` 增加断言
5. 在本文与 [package-contract](./package-contract.md) 登记
