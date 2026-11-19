# AGENTS.md

Repository-level hard constraints. See [docs/README.md](./docs/README.md) for details; when the two conflict, the code and this document take precedence, and fix the documentation along the way.

## Tech stack

- Package manager: **Bun** (lockfile `bun.lock`, CI uses `--frozen-lockfile`)
- Build: **tsdown**, ESM + CJS dual format, `platform: 'neutral'`
- Tests: **Vitest**, v8 coverage
- Style: **@antfu/eslint-config** (with formatters), no Prettier
- Git hooks: **lefthook** (`lefthook.yml`)
- Release: a tag triggers GitHub Actions; npm publishing is gated by the `NPM_OIDC_READY` repository variable (OIDC + provenance)

## Language

All project text is English: source comments, JSDoc, CLI help/descriptions, Markdown documentation, CHANGELOG entries, and commit messages. Runtime data (fixtures, upstream tweet text) keeps its original language.

## Mandatory for every task

1. Use named exports only; `export default` is forbidden.
2. Type imports must use `import type` / `export type`.
3. Avoid `any`; use `unknown` plus type guards at boundaries. The legacy parser mappers (`src/lib/parse/`) may use `any` where the upstream shape is undocumented, but new code must not.
4. Keep the core platform-agnostic: no runtime `node:*` imports in `src/lib` or `src/index.ts`. Node-only code belongs in `src/node/`, `src/cli/`, `src/cli.ts`, or `src/cli-bin.ts`.
5. Changing `package.json#exports` must be mirrored in `tests/exports.test.ts`.
6. New logic must have tests; fixing a bug starts with a reproduction case.
7. Write documentation first when changing public contracts, the build/release process, or incident fixes.
8. `lint:check` and `typecheck` must pass; never commit with `--no-verify`.
9. Do not enable `exports: true` in `tsdown.config.ts`.
10. Update `bun.lock` after any dependency version change.

## Common commands

```bash
bun install
bun run typecheck
bun run lint:check
bun run test
bun run test:coverage
bun run build
bun run check        # full gate
bun run check:docs   # documentation links and index
bun run cli -- --help
```

Integration tests are skipped unless `TWEET_KEYS` and `TWEET_TEST_ID` are set (see [docs/engineering/testing.md](./docs/engineering/testing.md)).

## Directories

| Path | Responsibility |
|---|---|
| `src/index.ts` | Core public entry (platform-neutral) |
| `src/node.ts` / `src/node/` | Node adapters (`./node` entry) |
| `src/cli.ts` / `src/cli-bin.ts` / `src/cli/` | CLI command tree and bin |
| `src/lib/` | Transport, requests, auth, pool, parsing, types |
| `tests/` | Tests, mirroring `src/` |
| `examples/` | Runnable examples |
| `scripts/` | Gate and release scripts |
| `docs/` | Internal documentation, indexed in `docs/README.md` |
| `.github/workflows/` | `ci.yml` / `publish.yml` |
| `.github/ISSUE_TEMPLATE/` | Issue templates |
