# Testing

## Layers

| Layer | Location | Dependencies | Contents |
|---|---|---|---|
| Unit | `tests/http/`, `tests/pool/`, `tests/parse/`, `tests/cli/` | no IO | pure functions, parsing, transport substitution, CLI arguments and planning |
| Contract | `tests/exports.test.ts` | filesystem | `package.json` export surface, files, engines, bin |
| Runtime smoke | `scripts/smoke-*.ts` | built `dist/` | imports the package on Bun and workerd (Miniflare) and exercises the mock-HTTP path; runs after `build` in CI, not in Vitest |
| Integration | `tests/integration/` | real keys | guarded by `describe.skipIf`, skipped by default |

All scripts are TypeScript and run with `bun scripts/<name>.ts` (`bun run check:docs`, `bun run verify:package`, `bun run smoke:bun`, …). `scripts/smoke-worker-entry.ts` is excluded from `tsc` because it imports the built `dist/index.js`; Bun's bundler resolves it when the worker smoke runs.

The directory mirrors the `src/` structure: `tests/parse/poll.test.ts` corresponds to `src/lib/parse/poll.ts`.

## Naming

- Files are `*.test.ts`; integration tests may use `*.e2e.test.ts`.
- Case names describe behavior and result: `returns null for empty input`, `throws when status is not ok`.
- Group by topic into `describe` blocks within a file.

## Tooling

- Vitest with `globals: true`; explicit imports are also legal, but stay consistent within the repo.
- Shared doubles and fixture loaders live in `tests/helpers/`; stronger fakes specific to a file are defined locally.
- Build the subject under test with factory functions instead of sharing mutable state through `beforeEach`.
- Transport tests inject `createFetchHttpClient({ fetch })` and never touch the network; pool tests inject `createFetcher`.

## Integration cases

`tests/integration/live.test.ts` is skipped by default; run it with the environment variables set:

```bash
TWEET_KEYS=<base64 cookie> TWEET_TEST_ID=<tweet-id> bun run test
# optional
TWEET_TEST_SPACE_ID=<space-id> TWEET_TEST_USER=<username>
```

Assertions only cover the contract shape (ids / field presence / cursor type) and never hard-code upstream copy.

## Coverage

`bun run test:coverage` uses v8 and reports `text-summary` / `json-summary` / `lcov` into `coverage/`.

- The coverage threshold is a ratchet: it may only go up, never down just to pass CI.
- New logic must ship with tests; a bug fix must start with a case that reproduces it.

## Forbidden

- Sharing mutable state between tests.
- Unit tests that depend on the real network or the real clock.
- Empty assertions such as `expect(true).toBe(true)`.
