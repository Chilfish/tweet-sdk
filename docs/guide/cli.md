# Command Line

`@chilfish/tweet` ships `tweet-cli` (the `bin`) and the `./cli` subpath. The CLI only depends on the `./node` capabilities and requires Node 20+.

## Install and run

```bash
# Global
bun add -g @chilfish/tweet

# Or run it directly
bunx @chilfish/tweet tweet get <id>
npx @chilfish/tweet tweet get <id>
```

For local development, use the repository script:

```bash
bun run cli --help
```

## Authentication

| Source | Description |
|---|---|
| `--keys/-k` | Comma-separated base64 cookies (that is, an individual `TWEET_KEYS` entry) |
| `--cookie` | Raw `k=v; k=v` cookie string; the CLI base64-encodes it automatically |
| `--env-file` | Path to `.env` (default `<pwd>/.env`); reads `TWEET_KEYS` / `http_proxy` |
| `--proxy/-p` | HTTP(S) proxy; overrides the env file |
| `--verbose/-v` | Writes pool rotation / parse-fallback events to stderr as JSON lines |

Precedence: `--keys` → `--cookie` → `TWEET_KEYS` from `--env-file`. When none of them is present the request is made as a guest (public data only).

## Commands

```
tweet-cli
├── tweet get <id>                   single tweet (enriched by default; --raw prints the raw payload)
├── tweet replies <id>               replies + nextCursor
├── tweet search <query>             search (supports from: / since: / min_faves: and so on)
├── user get <id|username>           user profile
├── user timeline <id>               user timeline (posts + replies)
├── space get <id>                   Space metadata (deleted → unavailable)
├── list tweets <id>                 list tweets
└── media download <id> -o <dir>     download original images / highest-bitrate mp4
```

## Output contract

- Query commands print JSON by default (2-space indentation); `--format markdown` (`-f md`) prints a human-readable view.
- Errors are always written to **stderr** as a JSON envelope, with a non-zero exit code:

```json
{
  "event": "error",
  "code": "CONFIG_INVALID",
  "message": "Unknown option --raww for tweet-cli tweet get. Did you mean --raw?",
  "context": { "field": "raww", "suggestion": "raw" }
}
```

- `media download` is a streaming command: it writes NDJSON events to stdout — `item` (`planned` / `downloaded` / `failed`) and a `done` summary; the exit code is 1 if any item fails.

## Unknown arguments

citty silently ignores unknown flags by default, which makes typos such as `--formt` in scripts very hard to notice. The CLI validates once before `runMain`:

- unknown flags fail immediately, with the closest candidate suggested;
- when an argument is placed before the subcommand (citty ignores those too), the CLI suggests moving it after the subcommand.

## Help

`--help` aligns output to the terminal width (CJK characters count as 2 columns) and wraps multi-line descriptions onto continuation lines; colors are disabled automatically under `NO_COLOR=1` / `CI` / `TERM=dumb`.

## Examples

```bash
# Fetch a raw tweet, enrich it, and print the human-readable view
tweet-cli tweet get 1968314084207788302 -f md

# Search the latest tweets for a hashtag
tweet-cli tweet search '#buildinpublic' --type latest --count 20

# Paginate
tweet-cli tweet replies 1968314084207788302 --cursor <nextCursor>

# Download media to ./out
tweet-cli media download 1968314084207788302 -o out --concurrency 4
```
