# Security

## Supply chain

- Publishing goes through **npm Trusted Publisher (OIDC)**; no long-lived `NPM_TOKEN` is stored.
- `npm publish --provenance` produces a verifiable provenance statement.
- Dependency upgrades are proposed by Dependabot as PRs and must pass the full gates.
- Never commit `.env`, tokens or certificates; `.gitignore` already covers the common sensitive files.

## Secrets

| Kind | Storage | Notes |
|---|---|---|
| npm publish credentials | GitHub OIDC | no static secret |
| `GITHUB_TOKEN` | injected by Actions | minimal permissions |
| Local development secrets | `.env` (ignored) | never enter the repository |

- Never `echo` a secret in a workflow; use `printf` when a file has to be written.
- Adding a secret requires updating this document and [build-and-release](./build-and-release.md).

## Permissions

- CI: `contents: read`.
- Publish: `contents: read` + `id-token: write` (required for OIDC).
- Introducing `contents: write` requires a stated purpose.

## Code boundaries

- Runtime dependencies are limited to `linkedom` and `x-client-transaction-id` (core) plus `undici` (optional peer, `./node`, lazy-loaded).
- Core has no runtime `node:*` imports; platform capabilities only enter through `./node` or an injected implementation.
- External input is validated at the boundary; internal calls trust the type system.
- `eval` / `new Function` are forbidden in library code.
- Dynamic `require` is not used.
- Loggers (`RettiwtPoolLogger` / `ParseLogger`) only receive tail summaries and never log full apiKey / cookie values.

## Vulnerability response

1. Do not disclose exploitable details in an issue; report privately through GitHub Security Advisories.
2. After reproducing, release a patch version and describe the impact in `CHANGELOG.md`.
3. When necessary, mark the affected versions with `npm deprecate`.
4. Once the incident is closed, record it in [postmortem](../postmortem/README.md) and add the missing tests and rules.
