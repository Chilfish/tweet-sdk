# Pull Request

## Motivation

<!-- Why is this change needed? Related issue: Closes # -->

## Behavior changes

<!-- User-observable changes; write "None" if there are none -->

## How it was verified

<!-- List the commands you ran and their results -->

- [ ] `bun run check`
- [ ] `bun run check:docs` (when docs are touched)

## Checklist

- [ ] Contains only this change, no drive-by refactoring
- [ ] New logic has tests; bug fixes come with a reproduction case first
- [ ] Public contract changes are recorded under `## Unreleased` in `CHANGELOG.md`
- [ ] Paths, commands, and fields in the docs match the code
- [ ] Nothing was committed with `--no-verify`
