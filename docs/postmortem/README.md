# Postmortems

Write one postmortem after every production/release incident, with an incrementing number: `NNN-short-slug.md`.

## Index

| No. | Topic | Root cause category | One-line lesson |
|---|---|---|---|
| — | None yet | — | — |

## Recurring Pitfalls Checklist

Run through this before writing code or changing configuration:

### Build and Artifacts

- Does `tsdown.config.ts` accidentally enable `exports: true`, overwriting the hand-maintained `exports`?
- When adding a new subpath entry, are `entry` and `package.json#exports` updated together?
- Under `platform: 'neutral'`, was any runtime `node:*` import introduced?

### Dependencies and Lockfile

- Did you only change `package.json` and forget to update `bun.lock`?
- CI uses `--frozen-lockfile`; a lockfile that disagrees with the manifest fails immediately.

### CI / Release

- Do the action versions actually exist? (`checkout@v4`, `setup-bun@v2`, `setup-node@v4`)
- Does the release go through OIDC, and was `NPM_TOKEN` or `registry-url` added by mistake?
- Does `CHANGELOG.md` have a section for the corresponding version? Do `package.json#version` and the tag match?

### Tests

- Does the new logic come with tests?
- Are there any tests that depend on the real network or on real time?

### Docs

- Were the docs updated for the public contract, the build process, and the incident fix?
- Do the commands, paths, and fields in the docs still match the code?

## Writing Requirements

- Facts first: timeline, evidence, blast radius.
- Write root causes at an actionable level; do not write "carelessness".
- Every lesson must land somewhere: either the recurring pitfalls checklist or `AGENTS.md`.
- Use [TEMPLATE.md](./TEMPLATE.md).
