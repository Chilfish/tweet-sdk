import type { User } from '../lib/models/data/User'
import type { EnrichedTweet, SpaceDetails } from '../lib/types/enriched'
import { formatSpaceDate, formatSpaceDuration, formatSpaceListeners } from '../lib/parse/space'

function formatCount(value: number | undefined): string {
  return typeof value === 'number'
    ? value.toLocaleString('en-US')
    : '0'
}

function quoteBlock(text: string): string {
  return text
    .split(/\r?\n/)
    .map(line => `> ${line}`)
    .join('\n')
}

/** Markdown view of a single enriched tweet (for humans; json stays the default for scripts / pipes). */
export function renderTweetMarkdown(tweet: EnrichedTweet): string {
  const lines: string[] = []
  const displayName = tweet.user.name || tweet.user.screen_name
  lines.push(`## ${displayName} (@${tweet.user.screen_name})`)
  lines.push('')
  lines.push(quoteBlock(tweet.text))

  const meta: string[] = [tweet.created_at]
  if (tweet.replyCount)
    meta.push(`replies ${formatCount(tweet.replyCount)}`)
  if (tweet.likeCount)
    meta.push(`likes ${formatCount(tweet.likeCount)}`)
  if (tweet.retweetCount)
    meta.push(`retweets ${formatCount(tweet.retweetCount)}`)
  if (tweet.viewCount)
    meta.push(`views ${formatCount(tweet.viewCount)}`)
  if (meta.length)
    lines.push('', meta.join(' · '))

  if (tweet.mediaDetails?.length) {
    lines.push('', '**Media**')
    for (const media of tweet.mediaDetails) {
      const label = media.type === 'photo'
        ? 'photo'
        : media.type
      lines.push(`- ${label}: ${media.media_url_https}`)
    }
  }

  if (tweet.poll) {
    lines.push('', `**Poll** (${formatCount(tweet.poll.totalVotes)} votes${tweet.poll.countsAreFinal ? ', final' : ''})`)
    for (const choice of tweet.poll.choices)
      lines.push(`- ${choice.label}: ${choice.percentage}% (${formatCount(choice.count)})`)
  }

  if (tweet.card) {
    lines.push('', `**Card** ${tweet.card.title || tweet.card.domain}`)
    if (tweet.card.description)
      lines.push(tweet.card.description)
    if (tweet.card.url)
      lines.push(tweet.card.url)
  }

  if (tweet.article) {
    lines.push('', `**Article** ${tweet.article.title || tweet.article.id}`)
    if (tweet.article.previewText)
      lines.push(tweet.article.previewText)
    lines.push(tweet.article.url)
  }

  if (tweet.space)
    lines.push('', renderSpaceMarkdown(tweet.space))

  if (tweet.quotedTweet) {
    lines.push('', '**Quoted**', '')
    lines.push(quoteBlock(`${tweet.quotedTweet.user.name} (@${tweet.quotedTweet.user.screen_name})\n${tweet.quotedTweet.text}`))
  }

  lines.push('', `Source: ${tweet.url}`)
  return lines.join('\n')
}

/** Markdown view of a tweet list (shared by replies / search / timeline). */
export function renderTweetsMarkdown(tweets: EnrichedTweet[], title: string): string {
  const lines: string[] = [`# ${title}`, '']
  for (const tweet of tweets) {
    lines.push(`## @${tweet.user.screen_name} · ${tweet.id}`)
    lines.push('', quoteBlock(tweet.text), '')
    lines.push(`Source: ${tweet.url}`, '')
  }
  return lines.join('\n').trimEnd()
}

/** Markdown view of a user profile (input is the `User` model deserialized by the fetch layer). */
export function renderUserMarkdown(user: User): string {
  return [
    `# ${user.fullName} (@${user.userName})`,
    '',
    `- id: ${user.id}`,
    `- created: ${user.createdAt}`,
    `- followers: ${formatCount(user.followersCount)}`,
    `- following: ${formatCount(user.followingsCount)}`,
    `- tweets: ${formatCount(user.statusesCount)}`,
    `- verified: ${user.isVerified ? 'yes' : 'no'}`,
    ...(user.location
      ? [`- location: ${user.location}`]
      : []),
    ...(user.description
      ? ['', user.description]
      : []),
  ].join('\n')
}

/** Markdown view of a Space card. */
export function renderSpaceMarkdown(space: SpaceDetails): string {
  const lines = [
    `## ${space.title || space.id} (${space.availability})`,
    '',
    `- host: ${space.host.name
      ? `${space.host.name} (@${space.host.screen_name})`
      : '-'}`,
    `- listeners: ${formatSpaceListeners(space.listenersCount)}`,
    `- started: ${formatSpaceDate(space.startedAt ?? space.createdAt)}`,
  ]
  if (space.durationMs)
    lines.push(`- duration: ${formatSpaceDuration(space.durationMs)}`)
  lines.push(`- url: ${space.url}`)
  return lines.join('\n')
}
