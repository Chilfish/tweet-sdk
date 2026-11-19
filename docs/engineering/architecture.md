# 架构

## 目标

这是一个可复用的 TypeScript 库脚手架。默认形态是**单入口、零运行时依赖、平台无关**，按需扩展。

## 分层

```
src/index.ts          公开入口（barrel，只做 re-export）
src/<domain>/         领域实现，按职责拆分目录
tests/                测试，目录镜像 src/
docs/                 内部文档
```

依赖方向严格单向：

```
index.ts  →  domain  →  utils
                  ↘  types
```

- `utils/` 不得引用 `domain/`。
- `domain/` 之间需要互相调用时，通过显式注入或注册表解耦，避免 ESM 循环依赖。
- `src/index.ts` 是唯一对外承诺的入口；内部模块路径不属于公开 API。

## 公开面

- 只使用具名导出，禁止 `export default`。
- 类型与值分开导出：`export type { ... }` / `export { ... }`。
- `package.json#exports` 决定发布面，`tests/exports.test.ts` 锁定其形状。
- 新增导出视为公开契约变化，必须更新 CHANGELOG 与文档。

## 平台无关

构建目标为 `platform: 'neutral'`，不内联 Node 内置模块：

- 源码里可以 `import type` 引用 `node:*` 类型。
- 运行时代码避免 `node:` 导入；确需 Node 能力时，拆成独立的子路径入口（如 `./node`）并单独声明 exports。
- 浏览器/Edge 兼容性由「零运行时依赖 + neutral 构建」保证。

## 扩展方式

| 需求 | 做法 |
|---|---|
| 增加子路径入口 | 新增 `src/<name>.ts`，在 tsdown `entry` 与 `package.json#exports` 同步声明 |
| 增加 CLI | 单独一个构建目标，`platform: 'node'`，依赖用 `onlyBundle` 白名单内联 |
| 引入运行时依赖 | 同步评估 ESM/CJS 双格式、tree-shaking、`sideEffects` |
| 拆分多包 | 迁移到 workspace，并把版本集中到 catalog |
