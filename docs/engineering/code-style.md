# Code style

Formatting and style checking are handled entirely by ESLint (antfu config); Prettier is not used. Git hooks are managed by lefthook (configuration in `lefthook.yml`).

## Basics

- Single quotes, no semicolons, 2-space indentation.
- No braces for single-statement `if`.
- Import order: external dependencies → internal modules → relative paths.
- Type imports must use `import type` / `export type` (`verbatimModuleSyntax`).
- `any` is forbidden; when the shape is unknown use `unknown` plus type guards and narrow at the boundary.

## Naming

| Kind | Rule | Example |
|---|---|---|
| Variables/functions | camelCase | `parseResponse` |
| Types/interfaces | PascalCase, no `I` prefix on interfaces | `RequestOptions` |
| Constants | UPPER_SNAKE only for genuine global constants | `DEFAULT_TIMEOUT` |
| Files | kebab-case or domain names | `build-and-release.md`, `id-codec.ts` |
| Tests | `*.test.ts`, case names describe behavior | `returns null for empty input` |

## Modules

- One primary responsibility per file; open the file with a block comment explaining "why it exists and where its boundaries are".
- Do not write comments that convey no information (e.g. `// increment i`).
- Group with `/** Section */`; `// ----` separators are forbidden.
- Internal helpers are not exported unless they have standalone test value.

## Types

- Express polymorphism with discriminated unions, not a pile of optional fields.
- Use `?` for optional fields and `| null` for explicitly nullable ones; never mix the two.
- Export public types in one place; do not leak internal implementation details.

## Error handling

- Bare `throw new Error()` is forbidden; define error types with a `code` or use the shared error factory.
- Error messages must locate themselves: include the object id, name and path.
- Validate at the boundaries (user input, external responses); internal calls trust the type system.
- In batch operations, log and continue on a single failure, then report a summary at the end.
