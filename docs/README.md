# Documentation Index

This directory is the single documentation entry point for the project. **Every new document must be registered as a row in the tables below**; `bun run check:docs` enforces this.

## The three mandatory document categories

Only the following changes require documentation up front; every other change gets a [development log](./development-log/README.md) entry the same day:

1. Changes to the public contract (export surface, types, behavioral semantics)
2. New or modified build/release processes
3. Incidents and reliability fixes (recorded in [postmortem](./postmortem/README.md))

## Guides

| Document | Description | When to read |
|---|---|---|
| [guide/getting-started.md](./guide/getting-started.md) | Installation, initialization, first command | First time working with this project |
| [guide/usage.md](./guide/usage.md) | Day-to-day development, releases, common operations | During day-to-day development |
| [guide/cli.md](./guide/cli.md) | `tweet-cli` commands, output contract, authentication | When using the command line |

## Engineering standards

| Document | Description | When to read |
|---|---|---|
| [engineering/architecture.md](./engineering/architecture.md) | Layering, dependency direction, public surface boundaries | Before adding a module or restructuring directories |
| [engineering/code-style.md](./engineering/code-style.md) | Naming, import order, types and error handling | Every time you write code |
| [engineering/testing.md](./engineering/testing.md) | Test layers, naming, coverage | When adding a feature or fixing a bug |
| [engineering/build-and-release.md](./engineering/build-and-release.md) | Dual-format builds, artifact contract, release pipeline | When changing build config or publishing |
| [engineering/ci.md](./engineering/ci.md) | Pipeline structure, caching, gates and troubleshooting | When changing a workflow or when CI fails |
| [engineering/dependencies.md](./engineering/dependencies.md) | Dependency policy, lockfile, upgrade process | When adding, removing or upgrading dependencies |
| [engineering/security.md](./engineering/security.md) | Supply chain, secrets, OIDC, vulnerability response | When secrets, publishing or security are involved |
| [engineering/git-workflow.md](./engineering/git-workflow.md) | Branches, commit messages, hooks, PR conventions | Before committing |
| [engineering/release-checklist.md](./engineering/release-checklist.md) | Item-by-item release checklist | Every release |
| [engineering/audit-2026-11-19.md](./engineering/audit-2026-11-19.md) | Pre-integration audit: architecture, dependencies, blockers and release readiness | Before wiring the package into a consumer |

## Reference

| Document | Description |
|---|---|
| [reference/api.md](./reference/api.md) | Public API and export surface |
| [reference/package-contract.md](./reference/package-contract.md) | `package.json` field contract |

## Postmortems

| Document | Description |
|---|---|
| [postmortem/README.md](./postmortem/README.md) | Postmortem index and self-check list of recurring pitfalls |
| [postmortem/TEMPLATE.md](./postmortem/TEMPLATE.md) | Template for a new postmortem |

## Development logs and archive

| Document | Description |
|---|---|
| [development-log/README.md](./development-log/README.md) | Conventions for date-based development logs |
| [archive/README.md](./archive/README.md) | Archive for documents that no longer apply |

## Conventions

- **Docs are the source of truth**: paths, commands and fields must match the current code; fix anything outdated in place.
- **Docs first**: this applies only to the "three mandatory document categories" above; nothing else has a process gate.
- **Archive policy**: documents that no longer apply move into `archive/` instead of staying in the main directories and misleading readers.
- `bun run check:docs` fails when a new document is not registered in the index, or when a link is broken.
