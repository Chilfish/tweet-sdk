import type { EnrichedTweet, MediaDetails } from '../../lib/types/enriched'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { defineCommand } from 'citty'
import { normalizeMediaUrl } from '../../lib/media-url'
import { CliError, configError } from '../error'
import { parsePositiveInt } from '../parseArgs'
import { clientArg, createClient, enrich } from '../shared'

interface MediaTarget {
  index: number
  type: 'photo' | 'video' | 'animated_gif'
  url: string
  filename: string
}

function extensionOf(url: string, fallback: string): string {
  try {
    const match = /\.([a-z0-9]{2,5})$/i.exec(new URL(url).pathname)
    return match?.[1]?.toLowerCase() ?? fallback
  }
  catch {
    return fallback
  }
}

/** Photos use `name=orig` (full-size image); paths that already carry an extension can take the query param appended directly. */
function originalPhotoUrl(url: string): string {
  const normalized = normalizeMediaUrl(url)
  return normalized.includes('?')
    ? `${normalized}&name=orig`
    : `${normalized}?name=orig`
}

/** Videos use the highest-bitrate mp4 variant. */
function bestVideoUrl(media: MediaDetails): string | undefined {
  if (media.type === 'photo' || !media.video_info)
    return undefined

  const mp4 = media.video_info.variants
    .filter(variant => variant.content_type === 'video/mp4')
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))

  return mp4[0]?.url
}

/** Pure function: tweet → list of media to download (easy to unit test offline). */
export function planMediaTargets(
  tweet: EnrichedTweet,
  options: { photos?: boolean, videos?: boolean } = {},
): MediaTarget[] {
  const includePhotos = options.photos !== false
  const includeVideos = options.videos !== false
  const targets: MediaTarget[] = []

  for (const media of tweet.mediaDetails ?? []) {
    if (media.type === 'photo') {
      if (!includePhotos)
        continue
      const url = originalPhotoUrl(media.media_url_https)
      targets.push({
        index: media.index,
        type: 'photo',
        url,
        filename: `${tweet.id}_${media.index}.${extensionOf(url, 'jpg')}`,
      })
      continue
    }

    if (!includeVideos)
      continue

    const url = bestVideoUrl(media)
    if (!url)
      continue

    targets.push({
      index: media.index,
      type: media.type,
      url,
      filename: `${tweet.id}_${media.index}.${extensionOf(url, 'mp4')}`,
    })
  }

  return targets
}

/** Run a batch of tasks with bounded concurrency; result order doesn't matter (each task reports its own events). */
async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0
  const runners = Array.from({
    length: Math.min(Math.max(1, limit), items.length),
  }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]!
      await worker(item)
    }
  })
  await Promise.all(runners)
}

interface DownloadTotals {
  total: number
  downloaded: number
  skipped: number
  failed: number
  bytes: number
}

async function download(
  target: MediaTarget,
  options: { dir: string, overwrite: boolean, dryRun: boolean, timeout?: number },
  totals: DownloadTotals,
): Promise<void> {
  const path = join(options.dir, target.filename)
  const base = {
    event: 'item',
    index: target.index,
    type: target.type,
    url: target.url,
    path,
  }

  if (options.dryRun) {
    console.log(JSON.stringify({ ...base, status: 'planned' }))
    return
  }

  try {
    const response = await fetch(target.url, {
      headers: { referer: 'https://x.com' },
      signal: options.timeout
        ? AbortSignal.timeout(options.timeout)
        : undefined,
    })

    if (!response.ok) {
      totals.failed += 1
      console.error(JSON.stringify({ ...base, status: 'failed', httpStatus: response.status }))
      return
    }

    const bytes = new Uint8Array(await response.arrayBuffer())
    await writeFile(path, bytes)
    totals.downloaded += 1
    totals.bytes += bytes.byteLength
    console.log(JSON.stringify({ ...base, status: 'downloaded', bytes: bytes.byteLength }))
  }
  catch (error) {
    totals.failed += 1
    console.error(JSON.stringify({
      ...base,
      status: 'failed',
      message: error instanceof Error
        ? error.message
        : String(error),
    }))
  }
}

export const mediaDownload = defineCommand({
  meta: {
    name: 'download',
    description: 'Download all media from a tweet (full-size images / highest-bitrate mp4; events are emitted as NDJSON)',
  },
  args: {
    'id': {
      type: 'positional',
      description: 'Tweet ID',
      required: true,
    },
    'out': {
      type: 'string',
      description: 'Output directory (default <pwd>/tweet-media)',
      alias: 'o',
    },
    'photos': {
      type: 'boolean',
      default: true,
      description: 'Download photos (use --no-photos to skip)',
    },
    'videos': {
      type: 'boolean',
      default: true,
      description: 'Download videos / GIFs (use --no-videos to skip)',
    },
    'overwrite': {
      type: 'boolean',
      description: 'Overwrite existing files (files are written anyway by default; the URLs are deterministic)',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Plan only, do not download',
    },
    'concurrency': {
      type: 'string',
      description: 'Number of concurrent downloads (default 3, max 8)',
    },
    'media-timeout': {
      type: 'string',
      description: 'Timeout per media download in ms (default 30000)',
    },
    ...clientArg,
  },
  async run({ args }) {
    const tweetId = String(args.id).trim()
    if (!tweetId)
      throw configError('media download requires a tweet id', { field: 'id' })

    const out = typeof args.out === 'string' && args.out.trim() !== ''
      ? args.out.trim()
      : 'tweet-media'
    const dir = resolve(process.cwd(), out)
    const concurrency = Math.min(parsePositiveInt(args.concurrency) ?? 3, 8)
    const timeout = parsePositiveInt(args['media-timeout']) ?? 30_000

    const client = createClient(args)
    const tweet = enrich(await client.getTweet(tweetId))
    if (!tweet) {
      throw new CliError(`Tweet ${tweetId} is unavailable (tombstone or schema change)`, {
        code: 'REQUEST_FAILED',
      })
    }

    const targets = planMediaTargets(tweet, { photos: args.photos, videos: args.videos })
    if (targets.length === 0) {
      console.error(JSON.stringify({ event: 'notice', message: 'No media found', tweetId }))
      console.log(JSON.stringify({
        event: 'done',
        tweetId,
        dir,
        total: 0,
        downloaded: 0,
        skipped: 0,
        failed: 0,
        bytes: 0,
      }))
      return
    }

    if (!args['dry-run'])
      await mkdir(dir, { recursive: true })

    const totals: DownloadTotals = {
      total: targets.length,
      downloaded: 0,
      skipped: 0,
      failed: 0,
      bytes: 0,
    }

    await runPool(targets, concurrency, target => download(target, {
      dir,
      overwrite: args.overwrite === true,
      dryRun: args['dry-run'] === true,
      timeout,
    }, totals))

    console.log(JSON.stringify({
      event: 'done',
      tweetId,
      dir: `${dir}${sep}`.replace(/[\\/]+$/, ''),
      ...totals,
    }))
    if (totals.failed > 0)
      process.exitCode = 1
  },
})
