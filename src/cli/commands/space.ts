import { defineCommand } from 'citty'
import { mapSpaceDetails } from '../../lib/parse/space'
import { createPrinter, outputFormatArg } from '../output'
import { renderSpaceMarkdown } from '../render'
import { clientArg, createClient } from '../shared'

export const spaceGet = defineCommand({
  meta: {
    name: 'get',
    description: 'Fetch Space metadata (ended spaces are still returned; deleted ones report unavailable)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Space ID (the id in x.com/i/spaces/<id>)',
      required: true,
    },
    raw: {
      type: 'boolean',
      description: 'Output the raw upstream audioSpace node',
    },
    ...outputFormatArg,
    ...clientArg,
  },
  async run({ args }) {
    const print = createPrinter(args)
    const client = createClient(args)
    const audioSpace = await client.getSpace(args.id)

    if (args.raw) {
      print(audioSpace, {
        markdown: value => JSON.stringify(value, null, 2),
      })
      return
    }

    const space = mapSpaceDetails(args.id, audioSpace)
    if (!space) {
      print(null, {
        markdown: () => `Space ${args.id} is unavailable`,
      })
      return
    }

    print(space, {
      markdown: value => renderSpaceMarkdown(value),
    })
  },
})
