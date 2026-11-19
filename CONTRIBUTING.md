# Contributing guide

Thanks for getting involved. Before submitting anything, please read [docs/README.md](./docs/README.md) and [AGENTS.md](./AGENTS.md).

## Development workflow

```bash
bun install
bun run check        # typecheck + lint + test:coverage + build + verify:package
bun run check:docs   # documentation link and index checks
```

## Branches and commits

- Branch off `main` with a short-lived branch: `feat/<scope>`, `fix/<scope>`, `docs/<scope>`.
- Conventional Commits: `type(scope): short English summary`.
- pre-commit runs `eslint --fix` automatically; pre-push runs `build` automatically.

## Code requirements

- Named exports, `export default` is forbidden.
- Use `import type` for type imports.
- `any` is forbidden.
- New logic must ship with tests; fixing a bug starts with a reproduction case.
- Do not touch unrelated code and do not slip in opportunistic refactors.

## Documentation requirements

The following changes must update the documentation first:

- Public contract changes (export surface, types, behavior)
- Build or release process changes
- Incident fixes (recorded in `docs/postmortem/`)

All other changes update `docs/development-log/`.

## PR

- The title follows the commit format.
- The description covers motivation, behavior changes, and how it was verified.
- Public contract changes are mirrored under `## Unreleased` in `CHANGELOG.md`.
- Make sure CI is fully green before requesting review.

## Reporting issues

Use the [issue templates](https://github.com/Chilfish/tweet-sdk/issues/new/choose). Do not report security issues publicly; see [SECURITY.md](./SECURITY.md).
