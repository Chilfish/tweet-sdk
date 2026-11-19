import type { EnrichedTweet } from '../../lib/types/enriched'
import { defineCommand } from 'citty'
import { createPrinter, outputFormatArg } from '../output'
import { renderTweetsMarkdown } from '../render'
import { clientArg, createClient, enrich } from '../shared'

export const listTweets = defineCommand({
  meta: {
    name: 'tweets',
    description: 'Fetch the tweets in a list',
  },
  args: {
    id: {
      type: 'positional',
      description: 'List ID',
      required: true,
    },
    ...outputFormatArg,
    ...clientArg,
  },
  async run({ args }) {
    const print = createPrinter(args)
    const client = createClient(args)
    const rawTweets = await client.getListTweets(args.id)

    const tweets = rawTweets
      .map(tweet => enrich(tweet))
      .filter((tweet): tweet is EnrichedTweet => tweet !== null)

    print({ tweets }, {
      markdown: value => renderTweetsMarkdown(value.tweets, `List ${args.id}`),
    })
  },
})
