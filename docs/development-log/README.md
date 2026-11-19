# Development Log

Records the work completed each day, one file per day named `YYYY-MM-DD.md`.

## When to Write

- Changes that do not fall under the "three must-write documents" (public contract / build and release / incident fixes).
- Decision-making, investigation, and rejected approaches.
- Intermediate state of large changes, so the next session can pick up where this one left off.

## Format

```md
# 2026-11-18

## Done

- Migrated to tsdown + bun
- Added the docs system and the check:docs gate

## Decisions

- Release does not use NPM_TOKEN: switched to OIDC to reduce long-lived credentials

## Next steps

- Add examples/api scenarios
- Evaluate whether changesets are needed
```

## Conventions

- Logs are not part of any gate; they do not need to be complete.
- Anything touching the public contract or an incident is also written into the formal docs; the log only points to it.
- This directory is not listed file by file in `docs/README.md` (`check-docs` exempts it).
