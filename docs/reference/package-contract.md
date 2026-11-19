# package.json Contract

`package.json` is the single source of truth for the published artifacts; the build must not rewrite any publishing field.

## Required fields

| Field | Current value | Constraint |
|---|---|---|
| `name` | `@chilfish/tweet` | Must match the npm package name |
| `type` | `module` | Source and ESM artifacts are both resolved as ESM |
| `packageManager` | `bun@1.4.4` | Must match the bun version used in CI |
| `sideEffects` | `false` | Guarantees tree-shaking |
| `files` | `dist` / `LICENSE.md` / `NOTICE.md` / `README.md` | Publishes only artifacts, documentation and upstream notices |
| `engines.node` | `>=20` | Matches the lower bound of the CI runtime matrix |
| `publishConfig` | `access: public` | Scoped package publishes publicly; provenance is requested explicitly by the publish workflow (`npm publish --provenance`) |

## exports

```json
{
  ".": {
    "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
  },
  "./node": {
    "import": { "types": "./dist/node.d.ts", "default": "./dist/node.js" },
    "require": { "types": "./dist/node.d.cts", "default": "./dist/node.cjs" }
  },
  "./cli": {
    "import": { "types": "./dist/cli.d.ts", "default": "./dist/cli.js" },
    "require": { "types": "./dist/cli.d.cts", "default": "./dist/cli.cjs" }
  },
  "./internals": {
    "import": { "types": "./dist/internals.d.ts", "default": "./dist/internals.js" },
    "require": { "types": "./dist/internals.d.cts", "default": "./dist/internals.cjs" }
  },
  "./package.json": "./package.json"
}
```

`bin` points to `./dist/cli-bin.js` (it carries a shebang, and the executable bit is added automatically at build time):

```json
{
  "bin": { "tweet-cli": "./dist/cli-bin.js" }
}
```

Rules:

- `types` must live inside each condition branch and come before `default`.
- Bare string exports (for example `".": "./dist/index.js"`) are not allowed.
- Every target file must actually exist; `bun run verify:package` validates this (including the `bin` target).
- New subpaths must be mirrored in `tests/exports.test.ts` and `tsdown.config.ts#entry`.
- `./node` / `./cli` / `./cli-bin` are the entries allowed to import `node:*`; `./internals` and the core must stay platform-neutral. A failing core build counts as breaking `platform: 'neutral'`.
- `./internals` is explicitly unstable and has no SemVer guarantee.

## Legacy top-level fields

`main` / `module` / `types` are kept only for compatibility with older tooling:

| Field | Value |
|---|---|
| `main` | `./dist/index.cjs` |
| `module` | `./dist/index.js` |
| `types` | `./dist/index.d.ts` |

New code should rely on `exports`, not on these three fields.

## Dependencies

Runtime dependencies are limited to the following three, and each must be either platform-agnostic or only reachable from `./node`:

| Dependency | Purpose | Entry that reaches it |
|---|---|---|
| `linkedom` | Parse the X page shell to generate the transaction id | core (pure JS) |
| `x-client-transaction-id` | `x-client-transaction-id` header computation | core (pure JS) |
| `undici` | Proxy dispatcher for Node fetch (`ProxyAgent`) | lazily loaded by `./node`; the core uses Bun's native `fetch` proxy option |

- The whole toolchain lives in `devDependencies`, with caret versions.
- Adding a runtime dependency requires justifying the need, the size and the alternatives, and updating this document.
- After changing dependencies you must commit the updated `bun.lock`.
- See [dependencies](../engineering/dependencies.md) for the full policy.

## Scripts

| Script | Convention |
|---|---|
| `build` | Calls `tsdown` only; performs no extra copying |
| `check` | Aggregates the full gate, shared by CI and local runs |
| `prepublishOnly` | Builds only, to prevent accidental publishes |
| `release` | Only bumps the version and creates the tag; never publishes locally |
