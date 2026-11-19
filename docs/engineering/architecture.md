# Architecture

## Goal

An SDK for X (Twitter) data extraction and tweet enrichment. The core is platform-neutral; Node and CLI capabilities live in the `./node` and `./cli` subpaths respectively, and applications only do assembly.

## Layers

```
src/index.ts            core public entry (barrel, re-exports only)
src/node.ts             ./node public entry
src/internals.ts        ./internals entry (unstable barrel over src/lib/**)
src/lib/
  http/                 transport contract and fetch implementation (no platform dependencies)
  transaction.ts        x-client-transaction-id (injectable provider)
  errors.ts             typed errors
  pool/                 RettiwtPool (cooldown / backoff / load balancing)
  client.ts             TwitterClient facade
  collections/          Groups / Requests / Extractors
  enums/                ResourceType and friends
  models/               request options, auth, data models
  requests/             HTTP request descriptors (return HttpRequest)
  services/             FetcherService and high-level services
  parse/                pure parsing and enrichment functions
  types/                raw (upstream shape) and enriched (public contract)
  media-url.ts          media URL normalization
src/node/               Node adapter implementation
tests/                  tests, directory mirrors src/
docs/                   internal docs
```

Dependency direction is strictly one-way:

```
index.ts / node.ts  →  client / pool / parse  →  services  →  requests / collections  →  types
```

- The parse layer (`parse/`) does not depend on `services/` and performs no IO; upstream data is injected by the caller (e.g. `fetchSpace` for `attachSpaceDetails`).
- `helpers` only keeps pure utilities (`JsonUtils`).
- `src/index.ts` / `src/node.ts` / `src/internals.ts` are the promised entry points; internal paths under `src/lib/**` are not public API.
- `src/internals.ts` is deliberately unstable: it only re-exports raw types, collections and descriptors for downstream parity tests, with no SemVer guarantee.

## Public surface

- Use named exports only; `export default` is forbidden.
- Keep types and values in separate exports: `export type { ... }` / `export { ... }`.
- `package.json#exports` defines the published surface, and `tests/exports.test.ts` locks its shape.
- A new export is a public contract change, so CHANGELOG, [api.md](../reference/api.md) and `tests/exports.test.ts` must be updated.

## Transport layer

`HttpClient` is the only transport contract:

```ts
interface HttpClient {
  request: <T>(req: HttpRequest) => Promise<HttpResponse<T>>
}
```

- The default implementation uses the global `fetch`, with `AbortSignal.timeout` handling timeouts; the default timeout is 30s, and `0` disables it.
- Request descriptors (`requests/*`) only describe `method` / `url` / `params` / `data` / `headers` and bind to no client.
- File reads and the undici proxy dispatcher appear only in `src/node/`; `src/lib/http/proxy.ts` holds the Bun-native proxy branch and the shared scheme validation, so the core never imports undici (Workers reject unresolved `import('undici')` at build time).
- The transaction id is injected through `TidProvider`: the default implementation fetches the X page shell, and restricted runtimes (e.g. ones that cannot parse HTML) can swap in a static implementation.

## Platform neutrality

The build target is `platform: 'neutral'` and does not inline Node built-in modules:

- Source code may reference `node:*` types via `import type`.
- Core code must not contain runtime `node:*` imports; when Node capabilities are genuinely needed, put them in the `./node` entry.
- Runtime dependencies are only `linkedom` / `x-client-transaction-id` (core, pure JS) and `undici` (optional peer, `./node`, lazy-loaded).

## How to extend

| Need | Approach |
|---|---|
| Add an endpoint | add a descriptor in `requests/<domain>.ts` → register it in `collections/Requests.ts` → add the resource in `enums/Resource.ts` → classify it in `collections/Groups.ts` |
| Add a subpath entry | add `src/<name>.ts` and declare it in both the tsdown `entry` and `package.json#exports` |
| Add a platform capability | put it in `src/node/` or a new subpath entry; core only accepts injection (Bun-native proxy is the exception and lives in `src/lib/http/proxy.ts`) |
| Add a runtime dependency | evaluate dual ESM/CJS output, tree-shaking, `sideEffects` and platform ownership at the same time |
| Split into multiple packages | migrate to a workspace and centralize versions in a catalog |
