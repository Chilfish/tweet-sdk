import { configError } from './error'

/** Output format for query commands; `json` is the default, keeping script / pipe compatibility. */
export type OutputFormat = 'json' | 'markdown'

const FORMAT_ALIASES: Record<string, OutputFormat> = {
  json: 'json',
  markdown: 'markdown',
  md: 'markdown',
}

/** Shared `--format` / `-f` argument definition. */
export const outputFormatArg = {
  format: {
    type: 'string',
    description: 'Output format: json | markdown (default json; md is an alias for markdown)',
    alias: 'f',
  },
} as const

/** Resolve the `--format` value; returns `json` when unset and throws on unknown values. */
export function parseOutputFormat(value: unknown): OutputFormat {
  if (value === undefined || value === '')
    return 'json'

  const key = typeof value === 'string'
    ? value.trim().toLowerCase()
    : ''
  const format = FORMAT_ALIASES[key]
  if (!format) {
    throw configError(`Unknown output format: ${String(value)}`, {
      field: 'format',
      value,
      supported: Object.keys(FORMAT_ALIASES),
    })
  }
  return format
}

/** Renderers for the non-JSON formats; each command supplies only the ones it supports. */
export interface OutputRenderers<T> {
  markdown: (value: T) => string
}

/** Render data as a string in the given format (no stdout write, so it stays unit-testable). */
export function renderOutput<T>(value: T, format: OutputFormat, renderers: OutputRenderers<T>): string {
  if (format === 'json')
    return JSON.stringify(value, null, 2)
  return renderers[format](value)
}

/** Resolve `--format` once and return a print function reused throughout the command. */
export function createPrinter(args: Record<string, unknown>): <T>(value: T, renderers: OutputRenderers<T>) => void {
  const format = parseOutputFormat(args.format)
  return (value, renderers) => {
    console.log(renderOutput(value, format, renderers))
  }
}
