import type { Entity, EntityWithType, RawTweet, SeparatorEntity } from '../types/enriched'

const LEADING_MENTION_RE = /^(@\w{1,15}\s*)+/

// Payload used for AI interactions
export interface TranslationPayload {
  maskedText: string
  entityMap: Map<string, Entity>
}

interface InternalEntityRange {
  type: EntityWithType['type']
  indices: [number, number]
  data: any
}

function extractRanges(tweet: RawTweet, leadingMentionEndIndex: number): InternalEntityRange[] {
  const ranges: InternalEntityRange[] = []
  const entitySet = new Set<string>()

  const addRange = (source: any, type: EntityWithType['type']): void => {
    if (!source || !source.indices)
      return

    const rawIndices = source.indices as [number, number]
    if (rawIndices[1] <= leadingMentionEndIndex)
      return

    // Media is special-cased: its logical length is 0, so it never takes part in splitting the text
    const effectiveIndices: [number, number] = type === 'media'
      ? [0, 0]
      : [
          Math.max(0, rawIndices[0] - leadingMentionEndIndex),
          Math.max(0, rawIndices[1] - leadingMentionEndIndex),
        ]

    const key = `${effectiveIndices[0]}-${effectiveIndices[1]}-${type}`
    if (entitySet.has(key))
      return
    entitySet.add(key)

    ranges.push({
      type,
      indices: effectiveIndices,
      data: { ...source, type },
    })
  }

  const legacy = tweet.legacy.entities
  const note = tweet.note_tweet?.note_tweet_results?.result.entity_set

  const processSource = (source: any): void => {
    if (!source)
      return
    source.hashtags?.forEach((e: any) => addRange(e, 'hashtag'))
    source.user_mentions?.forEach((e: any) => addRange(e, 'mention'))
    source.urls?.forEach((e: any) => addRange(e, 'url'))
    source.symbols?.forEach((e: any) => addRange(e, 'symbol'))
    source.media?.forEach((e: any) => addRange(e, 'media'))
  }

  if (note)
    processSource(note)
  else processSource(legacy)

  return ranges.sort((a, b) => a.indices[0] - b.indices[0])
}

function createFinalEntity(base: any, text: string, index: number): Entity {
  const common = { index, text }
  // Drop the indices field, keeping only the business data
  const { indices, ...cleanBase } = base

  switch (base.type) {
    case 'hashtag':
      return {
        ...cleanBase,
        ...common,
        href: `https://twitter.com/hashtag/${base.text}`,
      }
    case 'mention':
      return {
        ...cleanBase,
        ...common,
        href: `https://twitter.com/${base.screen_name}`,
      }
    case 'url':
    case 'media':
      return {
        ...cleanBase,
        ...common,
        href: base.expanded_url,
        text: base.display_url || text,
      }
    case 'symbol':
      return {
        ...cleanBase,
        ...common,
        href: `https://twitter.com/search?q=%24${base.text}`,
      }
    default:
      return {
        ...cleanBase,
        ...common,
      }
  }
}

export function getEntities(tweet: RawTweet, rawText: string): Entity[] {
  const leadingMentionMatch = rawText.match(LEADING_MENTION_RE)
  const leadingMentionEndIndex = leadingMentionMatch ? leadingMentionMatch[0].length : 0
  const displayText = rawText.slice(leadingMentionEndIndex)

  const ranges = extractRanges(tweet, leadingMentionEndIndex)
  const result: Entity[] = []
  let cursor = 0
  const textChars = Array.from(displayText)

  const textRanges = ranges.filter(r => r.type !== 'media')

  for (const range of textRanges) {
    const [start, end] = range.indices

    // Fill in the plain-text segments
    if (cursor < start) {
      const textSegment = textChars.slice(cursor, start).join('')
      if (textSegment) {
        result.push({
          type: 'text',
          text: textSegment,
          index: result.length,
        })
      }
    }

    // Handle functional entities
    const entityText = textChars.slice(start, end).join('')
    result.push(createFinalEntity(range.data, entityText, result.length))
    cursor = end
  }

  // Trailing text
  if (cursor < textChars.length) {
    result.push({
      type: 'text',
      text: textChars.slice(cursor).join(''),
      index: result.length,
    })
  }

  // Remove the text placeholder for the Media (if needed) and add the Media entity
  const mediaRange = ranges.find(range => range.type === 'media')
  if (mediaRange) {
    const mediaUrl = mediaRange.data.url?.trim()
    const idxToRemove = result.findIndex(e => e.type === 'text' && e.text.trim() === mediaUrl)
    if (idxToRemove !== -1)
      result.splice(idxToRemove, 1)

    result.forEach((entity) => {
      if (entity.type === 'text' && entity.text.includes(mediaUrl)) {
        entity.text = entity.text.replace(mediaUrl, '')
      }
    })

    // Media is always appended last, or placed according to business requirements
    // Here we do not add Media into the text stream; the UI normally renders it with a dedicated component
    // But to keep the data complete, if the original logic needed to return a Media entity, it could push
    // result.push(createFinalEntity(mediaRange.data, '', result.length))
  }

  // Re-normalize the indices so they stay contiguous
  const standardEntities = result.map((e, i) => ({ ...e, index: i }))

  const legacy = tweet.legacy
  const extendedEntities = legacy?.extended_entities || legacy?.entities
  const mediaList = extendedEntities?.media || []

  const altEntities: Entity[] = []
  mediaList.forEach((media: any, i: number) => {
    if (media.ext_alt_text) {
      altEntities.push({
        type: 'separator',
        text: ' | ',
        index: 30000 + i,
        mediaIndex: i,
      } as Entity)
      altEntities.push({
        type: 'media_alt',
        text: media.ext_alt_text,
        media_url: media.media_url_https,
        index: 20000 + i,
      } as Entity)
    }
  })

  return [
    ...standardEntities,
    ...altEntities,
  ]
}

export function getMediaAltEntities(tweet: RawTweet): Entity[] {
  const legacy = tweet.legacy
  const extendedEntities = legacy?.extended_entities || legacy?.entities
  const mediaList = extendedEntities?.media || []

  const altEntities: Entity[] = []
  mediaList.forEach((media: any, i: number) => {
    if (media.ext_alt_text) {
      // The Separator here mainly exists so the AI understands the context boundary
      // In the actual translation logic it may be filtered out or handled specially
      // altEntities.push({
      //   type: 'separator',
      //   text: ' | ',
      //   index: 30000 + i,
      //   mediaIndex: i,
      // } as Entity)
      altEntities.push({
        type: 'media_alt',
        text: media.ext_alt_text,
        media_url: media.media_url_https,
        index: 20000 + i,
      } as Entity)
    }
  })
  return altEntities
}

/**
 * Serialize: turns the Entity array into a string with placeholders
 */
export function serializeForAI(entities: Entity[]): TranslationPayload {
  const entityMap = new Map<string, Entity>()
  let maskedText = ''
  let pCounter = 0

  for (const entity of entities) {
    if (entity.type === 'text' || entity.type === 'media_alt') {
      maskedText += entity.text
    }
    else {
      // Generate a placeholder: <<__TYPE_INDEX__>>
      const placeholder = `<<__${entity.type.toUpperCase()}_${pCounter++}__>>`
      maskedText += placeholder
      entityMap.set(placeholder, entity)
    }
  }

  return { maskedText, entityMap }
}

/**
 * Restore: parses the translation result back into an Entity array
 */
export function restoreEntities(
  translatedText: string,
  entityMap: Map<string, Entity>,
  originalEntities: Entity[], // New parameter: the original entity array
): Entity[] {
  const result: Entity[] = []
  // The original `text` entities, in order, used to backfill the original text into the translated entity stream (display/sync purposes only)
  const originalTextEntities = originalEntities
    .filter(e => e.type === 'text')
    .sort((a, b) => a.index - b.index)
  let originalTextCursor = 0

  const originalMediaAltByIndex = new Map<number, Entity>()

  for (const entity of originalEntities) {
    if (entity.type === 'media_alt') {
      originalMediaAltByIndex.set(entity.index, entity)
    }
  }

  // Regex-capture the placeholders while keeping the separators
  const parts = translatedText.split(/(<<__[A-Z]+_\d+__>>)/g)
  let newIndex = 0
  let lastSeparator: SeparatorEntity | null = null

  for (const part of parts) {
    if (!part)
      continue

    if (entityMap.has(part)) {
      // === Matched an existing entity (Hashtag, URL, Mention) ===
      // Reuse the original object directly, preserving the original text (e.g. #originalTag) and href
      const original = entityMap.get(part)!

      if (original.type === 'separator') {
        if ('mediaIndex' in original) {
          lastSeparator = original as SeparatorEntity
        }
        continue
      }

      result.push({
        ...original,
        // Keep the original index so the editor can match it by index for backfilling
        index: original.index,
      })
    }
    else {
      if (lastSeparator) {
        // Handle the media_alt type
        const mediaIndex = 20000 + (lastSeparator.mediaIndex ?? 0)
        const originalMediaAlt = originalMediaAltByIndex.get(mediaIndex)

        result.push({
          type: 'media_alt',
          text: originalMediaAlt?.text ?? '', // Take text from the original entity
          aiTranslation: part,
          index: mediaIndex,
        })
        lastSeparator = null
      }
      else {
        // Handle the text type
        const originalText = originalTextEntities[originalTextCursor++]

        result.push({
          type: 'text',
          text: originalText?.text ?? '', // Take text from the original entity
          index: originalText?.index ?? (30000 + newIndex++),
          aiTranslation: part,
        })
      }
    }
  }

  return result
}

/**
 * Merges AI translation results back into the original entity array
 */
export function applyAITranslations(base: Entity[], ai: Entity[]): Entity[] {
  // The AI result may be a standalone translation stream (its structure does not align
  // with base, e.g. placeholders moved mid-sentence, so restoreEntities produces indices
  // base does not have, like 30000+ text fragments).
  // In that case return the translation stream directly, so that aligning and merging by
  // index does not silently drop fragments (same logic as shouldRenderTranslatedEntitiesDirectly
  // in the display layer).
  if (ai.length !== base.length || ai.some(e => !base.some(b => b.index === e.index))) {
    return ai
  }

  const aiMap = new Map(ai.map(e => [e.index, e]))

  return base.map((original) => {
    const found = aiMap.get(original.index)
    if (!found)
      return original

    // Only update aiTranslation when the AI result actually carries translated content that differs from the original
    const aiVal = found.aiTranslation || (found.text !== original.text
      ? found.text
      : undefined)

    if (aiVal) {
      return { ...original, aiTranslation: aiVal }
    }
    return original
  })
}
