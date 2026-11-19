# Dependencies

## Principles

- **Few, explainable runtime dependencies**: a new runtime dependency must justify its necessity, size, platform ownership and alternatives in the PR.
- **Toolchain goes in devDependencies**: build, test, lint and release scripts all count as development dependencies.
- **Caret versions**: `^x.y.z`; pinning is left to `bun.lock`.
- **Never edit the lockfile by hand**.

## Categories

| Category | Location | Examples |
|---|---|---|
| Runtime (core, platform-neutral) | `dependencies` | `linkedom`, `x-client-transaction-id` |
| Runtime (only `./node`) | `peerDependencies` (optional) | `undici` (lazy-loaded) |
| Development tooling | `devDependencies` | tsdown, vitest, eslint |
| Types | `devDependencies` | `@types/node`, `@types/bun` |

`undici` is an optional peer (`peerDependenciesMeta.undici.optional: true`), so consumers who do not use the Node proxy support do not have to install it. It is still listed in `neverBundle` and is only imported lazily from `./node`.

Dependency ownership must be explicit: a dependency reachable only from `./node` must not be imported by the core at runtime, otherwise `platform: 'neutral'` breaks.

## Upgrade flow

```bash
bun outdated
bun update <pkg>
bun run check
git diff bun.lock
```

- `bun run check` and `bun run check:docs` must pass after an upgrade.
- Major upgrades must be recorded in `CHANGELOG.md` under "Changes" or "Upgrade notes".
- If an upgrade fails, roll the dependency back; do not use `--force` to bypass peer conflicts.

## New dependency checklist

- [ ] Is it really needed? Can it be done with the standard library or an existing dependency?
- [ ] Is the license compatible with the project (MIT)?
- [ ] Does it support ESM? Is a CJS build required?
- [ ] Does it pull in Node built-in modules? That breaks `platform: 'neutral'`, so it can only live in `./node`.
- [ ] Has it been added to `neverBundle` so it is not inlined into the build output?
- [ ] Does it noticeably increase the install size?
- [ ] Has it been added to `dependencies` / `devDependencies` with `bun.lock` updated?

## Automated upgrades

`.github/dependabot.yml` checks the bun ecosystem dependencies every week. A Dependabot PR must pass the full CI before it can be merged.

`typescript` currently ignores `>=7`: `typescript-eslint` does not support TS 7 yet, so the ignore stays until upstream catches up.
