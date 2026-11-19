# CI

The pipeline is defined in `.github/workflows/ci.yml`.

## Structure

| job | Trigger | Contents |
|---|---|---|
| `check` | push to main / PR | typecheck, lint:check, test:coverage, build, artifact and docs validation, example run; uploads the `dist` and `coverage` artifacts |
| `runtime` | push to main / PR | depends on `check`, downloads the `dist` artifact and verifies both ESM and CJS imports under Node 20/22/24 |
| `runtime-bun` | push to main / PR | imports the built package on Bun, runs the mock-HTTP smoke and proves a dead proxy is rejected |
| `runtime-workers` | push to main / PR | bundles the built package with `bun build` and runs the smoke inside workerd through Miniflare |

The runtime smoke scripts live in `scripts/`: `smoke-runtime.ts` (shared mock-HTTP assertions), `smoke-bun.ts` and `smoke-workers.ts` (Miniflare driver). They import `dist/`, so they run after the build artifact is available. All scripts are TypeScript and run through `bun scripts/<name>.ts`.

## Node versions

The build tooling (tsdown / TypeScript toolchain) requires Node ≥22, while the library itself supports Node ≥20. Therefore:

- **The build runs only once, in the `check` job (Node 24)**.
- The `runtime` job installs no dependencies and does not build; it only consumes the `dist` artifact.
- This way Node 20 verifies "whether the output runs", not "whether the toolchain builds".

## Conventions

- **Minimal permissions**: `permissions: contents: read`.
- **Concurrency cancellation**: a new run on the same ref cancels the old one (`cancel-in-progress: true`).
- **Lockfile**: `bun install --frozen-lockfile`; a manifest that disagrees with `bun.lock` fails immediately.
- **Version consistency**: `packageManager`, the CI `bun-version` and the version in the README must stay in sync.
- **No skipped gates**: any failing step is a red build; `continue-on-error` is not used.

## Caching

`oven-sh/setup-bun@v2` brings its own dependency cache, so no extra `actions/cache` is needed. Never commit `node_modules` in CI.

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `lockfile had changes` | `bun.lock` was not updated | run `bun install` locally and commit the lockfile |
| `Cannot find module 'dist/index.js'` | the build did not run first | check the step order; build must come before the import checks |
| `eslint` fails only in CI | `lint` auto-fixed files locally | run `bun run lint:check` before committing |
| Coverage drops | new code has no tests | add tests; do not lower the threshold |

## When changing the workflow

1. Confirm the action versions really exist (`checkout@v7`, `setup-bun@v2`, `setup-node@v7`, `upload-artifact@v7`, `download-artifact@v8`).
2. Keep [build-and-release](./build-and-release.md) in sync with release-related changes.
3. Keep [release-checklist](./release-checklist.md) in sync when adding a gate.
