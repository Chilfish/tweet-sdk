/**
 * Format a date with a small, locale-independent pattern.
 *
 * Supported tokens: `yyyy`, `MM`, `dd`, `HH`, `mm`, `ss`.
 *
 * @param time - Date, ISO string, or epoch (seconds or milliseconds).
 * @param fmt - Output pattern, e.g. `yyyy-MM-dd HH:mm`.
 * @param timeZone - Optional IANA time zone (e.g. `UTC`, `Asia/Tokyo`).
 * Defaults to the runtime's local time zone.
 */
export function formatDate(
  time: string | number | Date,
  fmt = 'yyyy-MM-dd HH:mm:ss',
  timeZone?: string,
): string {
  if (typeof time === 'number' && time < 1e12)
    time *= 1000

  const date = new Date(time)
  if (Number.isNaN(date.getTime()))
    return ''

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find(part => part.type === type)?.value ?? '0'

  const pad = (num: number): string => num.toString().padStart(2, '0')
  const values: Record<string, string> = {
    yyyy: read('year'),
    MM: pad(Number(read('month'))),
    dd: pad(Number(read('day'))),
    HH: pad(Number(read('hour'))),
    mm: pad(Number(read('minute'))),
    ss: pad(Number(read('second'))),
  }

  return fmt.replace(/yyyy|MM|dd|HH|mm|ss/g, token => values[token] ?? token)
}

const DATE_KEYS = [
  'createdAt',
  'updatedAt',
  'date',
  'time',
  'timestamp',
  'created_at',
  'updated_at',
  'date_time',
  'time_stamp',
  'startDate',
  'endDate',
  'start_date',
  'end_date',
]

/** Recursively converts known date-like string fields to `Date` objects. */
export function convertDate(obj: Record<string, any>, keys: string[] = DATE_KEYS): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value === null)
      continue
    if (typeof value === 'object') {
      convertDate(value)
      continue
    }
    if (!keys.includes(key))
      continue
    if (typeof value !== 'string')
      continue

    const date = new Date(value)
    if (!Number.isNaN(date.getTime()))
      obj[key] = date
  }
}
