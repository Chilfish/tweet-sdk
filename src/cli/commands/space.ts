import { defineCommand } from 'citty'
import { mapSpaceDetails } from '../../lib/parse/space'
import { createPrinter, outputFormatArg } from '../output'
import { renderSpaceMarkdown } from '../render'
import { clientArg, createClient } from '../shared'

export const spaceGet = defineCommand({
  meta: {
    name: 'get',
    description: '获取 Space 元数据（已结束场次同样返回；已删除时为 unavailable）',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Space ID（x.com/i/spaces/<id> 里的 id）',
      required: true,
    },
    raw: {
      type: 'boolean',
      description: '输出上游 audioSpace 原始节点',
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
        markdown: () => `Space ${args.id} 不可用`,
      })
      return
    }

    print(space, {
      markdown: value => renderSpaceMarkdown(value),
    })
  },
})
