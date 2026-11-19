# Release checklist

Confirm each item in order; if any item fails, stop and fix it rather than skipping ahead.

## Before the release

- [ ] The working tree on `main` is clean and matches `origin/main`
- [ ] `## Unreleased` in `CHANGELOG.md` fully describes this version's changes
- [ ] Breaking changes are flagged in the CHANGELOG and the docs
- [ ] Public export surface changes have updated `tests/exports.test.ts`

## Local gates

```bash
bun install --frozen-lockfile
bun run check
bun run check:docs
```

- [ ] Everything passes
- [ ] `dist/` contains `index.js` / `index.cjs` / `index.d.ts` / `index.d.cts`
- [ ] `bun run verify:package` passes
- [ ] Both local `node -e "require('./dist/index.cjs')"` and an ESM import succeed

## Release

```bash
bun run release
```

- [ ] `bumpp` completes the version bump, commit and tag
- [ ] The tag is pushed (`git push --follow-tags`)
- [ ] GitHub Actions `Publish` succeeds (or is skipped while `NPM_OIDC_READY` is unset)
- [ ] `npm view <pkg>@<version>` resolves on npm
- [ ] The GitHub Release is created with notes taken from the matching CHANGELOG section

### First release only

- [ ] Publish manually from the tag (`npm publish --access public`); the workflow's
      `publish` job is skipped until `NPM_OIDC_READY` exists
- [ ] Configure the npm Trusted Publisher for this repository + `publish.yml`
- [ ] Create the repository variable `NPM_OIDC_READY=true`

## Rollback

- If a released version cannot be unpublished, ship a new patch version with the fix instead of overwriting the existing one.
- To retire a version, use `npm deprecate` and name the replacement version.
