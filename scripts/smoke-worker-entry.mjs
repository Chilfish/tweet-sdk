import { runDefaultTidSmoke, runSmoke } from './smoke-runtime.mjs'

export default {
  async fetch() {
    try {
      await runSmoke()
      await runDefaultTidSmoke()
      return new Response('ok')
    }
    catch (error) {
      return new Response(error?.stack ?? String(error), { status: 500 })
    }
  },
}
