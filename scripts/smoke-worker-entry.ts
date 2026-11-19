import * as sdk from '../dist/index.js'
import { runDefaultTidSmoke, runSmoke } from './smoke-runtime'

export default {
  async fetch(): Promise<Response> {
    try {
      await runSmoke(sdk)
      await runDefaultTidSmoke(sdk)
      return new Response('ok')
    }
    catch (error) {
      return new Response(error instanceof Error
        ? error.stack ?? error.message
        : String(error), { status: 500 })
    }
  },
}
