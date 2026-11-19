import type { ArgDef, ArgsDef, CommandDef, CommandMeta, Resolvable, SubCommandsDef } from 'citty'
import { CliError } from './error'

/**
 * 未知参数检查。
 *
 * citty 的 `parseArgs` 对未知 flag 静默忽略，`--formt`（少一个 a）会变成
 * 「什么都没传」并悄悄回退到默认格式。脚本 / agent 调用时极难发现，因此
 * 在 `runMain` 之前统一校验一次：未知 flag 直接 `CONFIG_INVALID`。
 */

/** citty 内建 flag。 */
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

/** 命令行里出现的一个 flag 名（已去掉前缀与 `=value`）。 */
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

/** 参数定义里能接受的全部名字（主名 + 别名 + `no-` 变体）。 */
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

/** 该参数是否要吃掉下一个 token。 */
function takesValue(args: ArgsDef | undefined, canonical: string): boolean {
  const def = (args ?? {})[canonical] as ArgDef | undefined
  return def?.type === 'string' || def?.type === 'enum'
}

/** 在整棵命令树里找某个 flag（用于提示「参数写在子命令之后」）。 */
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

/** 编辑距离，用于给未知 flag 找最接近的候选。 */
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
    // 单字母别名不作候选：提示 "--foo → --f" 只会更迷惑。
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
        hint: '未知参数会被 citty 静默忽略，所以这里直接报错；用 --help 查看该命令支持的参数',
      },
    },
  )
}

/**
 * 校验命令行里没有该（子）命令未声明的 flag。
 *
 * @param root 命令树根（`main`）
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
      // 参数存在、只是写在了子命令之前（citty 会静默忽略）——给出更明确的修法。
      if (await hasOptionInTree(root, name))
        error.context.next = `参数由子命令自己声明：把 --${name} 写在子命令之后`
      throw error
    }

    // 值型参数的下一个 token 是它的值，不当成 flag 校验（`--since -1` 不误报）。
    if (!hasInlineValue(token) && takesValue(args, canonical))
      index += 1
  }
}
