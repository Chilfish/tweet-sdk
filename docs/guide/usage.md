# Usage Guide

## Day-to-day commands

| Command | Purpose |
|---|---|
| `bun run dev` | tsdown watch, incremental builds into `dist/` |
| `bun run build` | One-off build of ESM + CJS + type declarations |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `eslint . --fix` |
| `bun run lint:check` | Check only, no fixes (used in CI) |
| `bun run test` | Run the whole test suite once |
| `bun run test:watch` | Watch mode |
| `bun run test:coverage` | With v8 coverage |
| `bun run example` | Run `examples/basic.ts` |
| `bun run check` | Full gate |
| `bun run check:docs` | Validate documentation links and index registration |

## Writing code

```bash
# Add a new parsing module
src/lib/parse/example.ts
tests/parse/example.test.ts
```

- core modules live in `src/lib/`, Node capabilities live in `src/node/`; `src/index.ts` / `src/node.ts` only re-export.
- Parsing modules stay pure functions: no network access, no file reads; upstream data is injected by the caller.
- Use `import type` for type imports.
- New exports must be mirrored in `tests/exports.test.ts`, [api.md](../reference/api.md) and the CHANGELOG.
- New subpath entries must be mirrored in `tsdown.config.ts#entry` and `package.json#exports`.

## Committing

pre-commit runs `eslint --fix` on staged files. For the commit message format see [git-workflow](../engineering/git-workflow.md):

```bash
git commit -m "feat(parser): support multi-value arguments"
```

pre-push runs `bun run build`; if the build fails the push is blocked.

## Releasing

```bash
# 1. Write the ## Unreleased section of the CHANGELOG
# 2. Release with a single command
bun run release
```

For the full process and authentication setup see [build-and-release](../engineering/build-and-release.md); for the item-by-item checks see [release-checklist](../engineering/release-checklist.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `bun install --frozen-lockfile` fails | Run `bun install` locally to update `bun.lock`, then commit it |
| pre-commit does not run | Reinstall the hooks with `bunx lefthook install` |
| `check-docs` reports an unregistered document | Add a row to the index in `docs/README.md` |
| The release job reports a version mismatch | The tag differs from `package.json#version`; re-create the tag |
| Artifacts are missing files | Run `bun run build` first, then `bun run verify:package` |
| `./node` cannot resolve `node.d.ts` | The build output is missing; run `bun run build` again and make sure `entry` includes `src/node.ts` |
| A `node:` import shows up in the core build | A platform capability was placed in core; move it to `src/node/` or inject it instead |
