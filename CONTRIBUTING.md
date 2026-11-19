# 贡献指南

感谢参与。提交前请先读 [docs/README.md](./docs/README.md) 与 [AGENTS.md](./AGENTS.md)。

## 开发流程

```bash
bun install
bun run check        # typecheck + lint + test:coverage + build + verify:package
bun run check:docs   # 文档链接与索引校验
```

## 分支与提交

- 从 `main` 拉短分支：`feat/<scope>`、`fix/<scope>`、`docs/<scope>`。
- Conventional Commits：`type(scope): 简短中文摘要`。
- pre-commit 自动 `eslint --fix`，pre-push 自动 `build`。

## 代码要求

- 具名导出，禁止 `export default`。
- 类型导入使用 `import type`。
- 禁止 `any`。
- 新增逻辑必须带测试；修 bug 先补复现用例。
- 不改无关代码，不做顺手的重构。

## 文档要求

以下改动必须先更新文档：

- 公开契约变化（导出面、类型、行为）
- 构建或发布流程变化
- 事故修复（写入 `docs/postmortem/`）

其余改动更新 `docs/development-log/`。

## PR

- 标题遵循提交格式。
- 描述包含动机、行为变化、验证方式。
- 公开契约变化同步 `CHANGELOG.md` 的 `## Unreleased`。
- 确保 CI 全绿后再请求 review。

## 报告问题

使用 [Issue 模板](https://github.com/Chilfish/tweet-sdk/issues/new/choose)。安全问题请勿公开提交，见 [SECURITY.md](./SECURITY.md)。
