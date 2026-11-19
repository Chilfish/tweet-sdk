# Git workflow

## Branches

- `main` is the only long-lived branch and is always releasable.
- Features and fixes use short-lived branches: `feat/<scope>`, `fix/<scope>`.
- Rebase onto the latest `main` before merging to keep history linear.

## Commit messages

Conventional Commits, in the form:

```
type(scope): short imperative summary
```

Common types:

| type | Purpose |
|---|---|
| `feat` | new feature |
| `fix` | bug fix |
| `refactor` | restructuring without behavior change |
| `test` | tests |
| `docs` | documentation |
| `build` | build/dependencies |
| `ci` | pipeline |
| `chore` | misc |

- One commit per logical unit; do not save everything for the end.
- Split large changes into 3–4 commits by module or file.
- Do not write summaries like "fix bug" that cannot be located; state the object and the behavior.

## Git hooks (lefthook)

Configuration lives in `lefthook.yml` and is installed by `prepare: lefthook install` during `bun install`.

| Hook | Behavior |
|---|---|
| pre-commit | runs `eslint --fix` on staged files and writes the result back to the index |
| pre-push | runs `bun run build` |

- `--no-verify` is discouraged; if it is truly necessary, explain why in the PR.
- The full gates (typecheck / test / coverage) run in CI; hooks only provide fast feedback.

## PRs

- The title follows the commit message format.
- The description covers: motivation, behavior changes, how it was verified.
- A public contract change must update `CHANGELOG.md` and the related docs in the same PR.
- When the diff exceeds 10 files or 200 lines, explain why it is not split or split it into separate commits.
