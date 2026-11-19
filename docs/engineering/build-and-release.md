# Build and release

## Build

Tool: **tsdown** (rolldown core). Configuration lives in `tsdown.config.ts`.

| Item | Value | Rationale |
|---|---|---|
| `entry` | `src/index.ts`, `src/node.ts`, `src/cli.ts`, `src/cli-bin.ts` | multiple entries: core + Node adapter + CLI + bin |
| `format` | `esm` + `cjs` | compatible with both `import` and `require` |
| `dts` | `true` | generates `index.*` / `node.*` / `cli.*` type declarations |
| `platform` | `neutral` | not bound to Node; `node:` appears only in `./node` / `./cli` |
| `target` | `es2022` | modern syntax, avoids excessive downleveling |
| `neverBundle` | `/^node:/`, `linkedom`, `x-client-transaction-id`, `undici` | runtime dependencies stay external |
| `alwaysBundle` | `citty` | the CLI framework has zero dependencies, so inlining it makes `bunx` / `npx` work without installing anything |
| `exports` | `false` | `package.json#exports` is maintained by hand and the build must not rewrite it |

Output contract:

```
dist/index.js      core ESM
dist/index.cjs     core CJS
dist/index.d.ts    core ESM types
dist/index.d.cts   core CJS types
dist/node.js       Node adapter ESM
dist/node.cjs      Node adapter CJS
dist/node.d.ts     Node adapter ESM types
dist/node.d.cts    Node adapter CJS types
dist/cli.js        CLI command tree ESM
dist/cli.cjs       CLI command tree CJS
dist/cli.d.ts      CLI types
dist/cli.d.cts     CLI CJS types
dist/cli-bin.js    bin (with shebang; the build adds the executable bit automatically)
```

Shared code is split into chunks such as `client-<hash>.js`, and each entry reuses the implementation through it; publishing only has to guarantee that the entry files above exist.

After the build, CI verifies that the entry files exist and imports them under Node 20/22/24; `bun run verify:package` also checks the tarball file list to make sure source, tests and scripts do not end up in the published package.

## package.json contract

- `exports["."]`, `exports["./node"]` and `exports["./cli"]` must be conditional objects with their own `types` under `import` / `require`.
- `bin` points to `./dist/cli-bin.js`, and `verify:package` checks that the target exists.
- `files` contains only `dist`, `LICENSE.md`, `NOTICE.md`, `README.md`.
- `sideEffects: false` guarantees tree-shaking.
- `engines.node` stays in sync with the lower bound of the CI matrix.
- `publishConfig.provenance: true` attaches provenance to the publish.

`tests/exports.test.ts` locks the shape above; changing the export surface requires changing the test first.

## Release pipeline

1. Update `## Unreleased` in `CHANGELOG.md` and describe this version's changes.
2. `bun run release` → `bumpp` bumps the version, commits, creates the tag and pushes.
3. The tag push triggers `.github/workflows/publish.yml`:
   - verify the tag matches `package.json#version`
   - verify `CHANGELOG.md` contains a `## <version>` section
   - typecheck / lint:check / test / build
   - `npm publish --provenance --access public`
4. After publishing, create the GitHub Release (the same CHANGELOG section can serve as the notes).

## Authentication

Use **npm Trusted Publisher (OIDC)** and do not configure `NPM_TOKEN`:

- The workflow needs `permissions.id-token: write`.
- `setup-node` deliberately **does not** set `registry-url`, to avoid writing an `.npmrc` with a placeholder token.
- Before the first release, bind this repository and this workflow in the npm package settings.

## Forbidden

- Running `npm publish` directly locally (bypasses the gates).
- Enabling `exports: true` in `tsdown.config.ts` (it would rewrite the hand-maintained exports).
- Publishing without updating CHANGELOG (CI fails immediately).
- Introducing runtime `node:*` imports in core (breaks `platform: 'neutral'`).
