# AGENTS.md

仓库级硬约束。细节见 [docs/README.md](./docs/README.md)，两者冲突时以代码与本文为准并顺手修正文档。

## 技术栈

- 包管理器：**Bun**（锁文件 `bun.lock`，CI 使用 `--frozen-lockfile`）
- 构建：**tsdown**，ESM + CJS 双格式，`platform: 'neutral'`
- 测试：**Vitest**，v8 coverage
- 风格：**@antfu/eslint-config**（含 formatters），不使用 Prettier
- Git hooks：**lefthook**（`lefthook.yml`）
- 发布：tag 触发 GitHub Actions，npm OIDC + provenance

## 每次任务都必须成立

1. 只使用具名导出，禁止 `export default`。
2. 类型导入必须 `import type` / `export type`。
3. 禁止 `any`；用 `unknown` + 类型守卫在边界收窄。
4. 源码保持平台无关，不引入运行时 `node:*` 导入。
5. 改 `package.json#exports` 必须同步 `tests/exports.test.ts`。
6. 新增逻辑必须有测试；修 bug 必须先补复现用例。
7. 改公开契约、构建/发布流程、事故修复时先写文档。
8. `lint:check` 与 `typecheck` 必须通过，不提交 `--no-verify`。
9. 不在 `tsdown.config.ts` 里开启 `exports: true`。
10. 依赖版本改动后更新 `bun.lock`。

## 常用命令

```bash
bun install
bun run typecheck
bun run lint:check
bun run test
bun run build
bun run check        # 全量门禁
bun run check:docs   # 文档链接与索引
```

## 目录

| 路径 | 职责 |
|---|---|
| `src/index.ts` | 唯一公开入口 |
| `tests/` | 测试，镜像 `src/` |
| `examples/` | 可运行示例 |
| `scripts/` | 门禁与发布脚本 |
| `docs/` | 内部文档，索引在 `docs/README.md` |
| `.github/workflows/` | `ci.yml` / `publish.yml` |
| `.github/ISSUE_TEMPLATE/` | Issue 模板 |
