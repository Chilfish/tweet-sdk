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

/** 照片走 `name=orig`（原图）；已带扩展名的路径可以直接追加查询参数。 */
function originalPhotoUrl(url: string): string {
  const normalized = normalizeMediaUrl(url)
  return normalized.includes('?')
    ? `${normalized}&name=orig`
    : `${normalized}?name=orig`
}

/** 视频取码率最高的 mp4 变体。 */
function bestVideoUrl(media: MediaDetails): string | undefined {
  if (media.type === 'photo' || !media.video_info)
    return undefined

  const mp4 = media.video_info.variants
    .filter(variant => variant.content_type === 'video/mp4')
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))

  return mp4[0]?.url
}

/** 纯函数：推文 → 待下载媒体清单（便于离线单测）。 */
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

/** 并发跑一组任务，保持结果顺序无关（每个任务自行上报事件）。 */
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
    description: '下载一条推文的全部媒体（图片原图 / 最高码率 mp4；事件以 NDJSON 输出）',
  },
  args: {
    'id': {
      type: 'positional',
      description: '推文 ID',
      required: true,
    },
    'out': {
      type: 'string',
      description: '输出目录（默认 <pwd>/tweet-media）',
      alias: 'o',
    },
    'photos': {
      type: 'boolean',
      default: true,
      description: '下载图片（--no-photos 跳过）',
    },
    'videos': {
      type: 'boolean',
      default: true,
      description: '下载视频 / GIF（--no-videos 跳过）',
    },
    'overwrite': {
      type: 'boolean',
      description: '覆盖已存在文件（默认仍然写入同名文件；URL 是确定性的）',
    },
    'dry-run': {
      type: 'boolean',
      description: '只规划不下载',
    },
    'concurrency': {
      type: 'string',
      description: '并发下载数（默认 3，上限 8）',
    },
    'media-timeout': {
      type: 'string',
      description: '单个媒体下载超时 ms（默认 30000）',
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
      throw new CliError(`Tweet ${tweetId} 不可用（tombstone 或结构变更）`, {
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
