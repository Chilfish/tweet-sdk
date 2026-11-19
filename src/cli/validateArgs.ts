import type { ArgDef, ArgsDef, CommandDef, CommandMeta, Resolvable, SubCommandsDef } from 'citty'
import { CliError } from './error'

/**
 * Unknown flag validation.
 *
 * citty's `parseArgs` silently ignores unknown flags, so `--formt` (one missing letter) becomes
 * "nothing was passed" and quietly falls back to the default. That is very hard to spot from scripts /
 * agents, so we validate once before `runMain`: unknown flags fail with `CONFIG_INVALID`.
 */

/** Flags built into citty. */
const BUILTIN_FLAGS = new Set(['help', 'h', 'version', 'v'])

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined)
    return []
  return Array.isArray(value)
    ? value
    : [value]
}

async function resolveValue<T>(value: Resolvable<T> | undefined): Promise<T | undefined> {
  if (typeof value === 'function')
    return await (value as () => T | Promise<T>)()
  return await value
}

/** A single flag name as it appears on the command line (prefix and `=value` already stripped). */
function flagName(token: string): string {
  const bare = token.replace(/^-+/, '')
  const eq = bare.indexOf('=')
  return eq === -1
    ? bare
    : bare.slice(0, eq)
}

function hasInlineValue(token: string): boolean {
  return token.includes('=')
}

/** Every name an argument definition accepts (primary name + aliases + `no-` variants). */
function acceptedNames(args: ArgsDef | undefined): Map<string, string> {
  const names = new Map<string, string>()
  for (const [name, def] of Object.entries(args ?? {})) {
    names.set(name, name)
    for (const alias of toArray((def as { alias?: string | string[] }).alias))
      names.set(alias, name)
    names.set(`no-${name}`, name)
    const negative = /^no-(.+)$/.exec(name)
    if (negative)
      names.set(negative[1]!, name)
  }
  return names
}

/** Whether this argument consumes the next token as its value. */
function takesValue(args: ArgsDef | undefined, canonical: string): boolean {
  const def = (args ?? {})[canonical] as ArgDef | undefined
  return def?.type === 'string' || def?.type === 'enum'
}

/** Find a flag anywhere in the command tree (used to hint that the flag belongs after the subcommand). */
async function hasOptionInTree(command: CommandDef, name: string): Promise<boolean> {
  const args = await resolveValue(command.args as Resolvable<ArgsDef> | undefined)
  if (acceptedNames(args).has(name))
    return true
  const subCommands = await resolveValue(command.subCommands as Resolvable<SubCommandsDef> | undefined)
  for (const sub of Object.values(subCommands ?? {})) {
    if (await hasOptionInTree((await resolveValue(sub as Resolvable<CommandDef>))!, name))
      return true
  }
  return false
}

/** Edit distance, used to find the closest candidate for an unknown flag. */
function distance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  let prev = Array.from({ length: cols }, (_, index) => index)
  for (let i = 1; i < rows; i += 1) {
    const current = [i]
    for (let j = 1; j < cols; j += 1) {
      current[j] = Math.min(
        prev[j]! + 1,
        current[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1]
          ? 0
          : 1),
      )
    }
    prev = current
  }
  return prev[cols - 1]!
}

function closest(name: string, candidates: Iterable<string>): string | undefined {
  let best: string | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    // Single-letter aliases are not candidates: suggesting "--foo → --f" only adds confusion.
    if (candidate.length < 3)
      continue
    const value = distance(name, candidate)
    if (value < bestDistance) {
      bestDistance = value
      best = candidate
    }
  }
  return bestDistance <= Math.max(2, Math.floor(name.length / 3))
    ? best
    : undefined
}

function unknownFlagError(name: string, command: string, accepted: Iterable<string>): CliError {
  const suggestion = closest(name, accepted)
  return new CliError(
    suggestion
      ? `Unknown option --${name} for ${command}. Did you mean --${suggestion}?`
      : `Unknown option --${name} for ${command}.`,
    {
      code: 'CONFIG_INVALID',
      context: {
        field: name,
        command,
        ...(suggestion
          ? { suggestion }
          : {}),
        hint: 'citty silently ignores unknown flags, so this fails fast instead; run --help to see the flags this command supports',
      },
    },
  )
}

/**
 * Validate that the command line contains no flags undeclared by this (sub)command.
 *
 * @param root Command tree root (`main`)
 * @param rawArgs `process.argv.slice(2)`
 */
export async function assertKnownFlags(root: CommandDef, rawArgs: readonly string[]): Promise<void> {
  let command = root
  let commandName = ((await resolveValue(root.meta)) as CommandMeta | undefined)?.name ?? 'tweet-cli'
  let args = await resolveValue(command.args as Resolvable<ArgsDef> | undefined)
  let positionals = 0

  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index]!

    if (token === '--')
      return

    if (!token.startsWith('-') || token === '-') {
      const subCommands = await resolveValue(command.subCommands as Resolvable<SubCommandsDef> | undefined)
      const sub = subCommands?.[token]
      if (positionals === 0 && sub) {
        command = (await resolveValue(sub as Resolvable<CommandDef>))!
        commandName = `${commandName} ${token}`
        args = await resolveValue(command.args as Resolvable<ArgsDef> | undefined)
        continue
      }
      positionals += 1
      continue
    }

    const name = flagName(token)
    const normalized = name.startsWith('no-')
      ? name.slice(3)
      : name
    if (BUILTIN_FLAGS.has(name) || BUILTIN_FLAGS.has(normalized))
      continue

    const accepted = acceptedNames(args)
    const canonical = accepted.get(name) ?? accepted.get(normalized)
    if (canonical === undefined) {
      const error = unknownFlagError(name, commandName, accepted.keys())
      // The flag exists but was written before the subcommand (citty ignores it silently) — give an explicit fix.
      if (await hasOptionInTree(root, name))
        error.context.next = `The flag is declared by the subcommand itself: put --${name} after the subcommand`
      throw error
    }

    // The token after a value-taking flag is its value, so don't validate it as a flag (`--since -1` stays quiet).
    if (!hasInlineValue(token) && takesValue(args, canonical))
      index += 1
  }
}
