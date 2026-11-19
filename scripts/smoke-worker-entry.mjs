import { runSmoke } from './smoke-runtime.mjs'

export default {
  async fetch() {
    try {
      await runSmoke()
      return new Response('ok')
    }
    catch (error) {
      return new Response(error?.stack ?? String(error), { status: 500 })
    }
  },
}
