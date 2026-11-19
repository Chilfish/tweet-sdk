# 安全

## 供应链

- 发布通过 **npm Trusted Publisher (OIDC)**，不保存长期 `NPM_TOKEN`。
- `npm publish --provenance` 生成可验证的来源证明。
- 依赖升级由 Dependabot 提出 PR，必须通过全量门禁。
- 不提交 `.env`、token、证书；`.gitignore` 已覆盖常见敏感文件。

## 密钥

| 类型 | 存放 | 说明 |
|---|---|---|
| npm 发布凭据 | GitHub OIDC | 无静态 secret |
| `GITHUB_TOKEN` | 由 Actions 注入 | 权限最小化 |
| 本地开发密钥 | `.env`（已忽略） | 不进入仓库 |

- workflow 中禁止 `echo` secret；需要写文件时使用 `printf`。
- 新增 secret 必须同步本文与 [build-and-release](./build-and-release.md)。

## 权限

- CI：`contents: read`。
- 发布：`contents: read` + `id-token: write`（OIDC 必需）。
- 引入 `contents: write` 需要说明用途。

## 代码边界

- 运行时零依赖、无 `node:*` 导入，减少攻击面。
- 外部输入在边界校验；内部调用信任类型系统。
- 禁止在库代码中执行 `eval` / `new Function`。
- 不使用动态 `require`。

## 漏洞响应

1. 在 issue 中不要披露可利用细节；通过 GitHub Security Advisories 私下报告。
2. 复现后发布 patch 版本，并在 `CHANGELOG.md` 说明影响范围。
3. 必要时使用 `npm deprecate` 标记受影响版本。
4. 事件结束后在 [postmortem](../postmortem/README.md) 记录，并补测试与规则。
