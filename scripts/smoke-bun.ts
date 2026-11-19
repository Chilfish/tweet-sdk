import type * as TweetNode from '../src/node'
import type { SmokeSdk } from './smoke-runtime'
import { createServer } from 'node:http'
import { runSmoke } from './smoke-runtime'

const sdk = await import(new URL('../dist/index.js', import.meta.url).href) as SmokeSdk
const nodeSdk = await import(new URL('../dist/node.js', import.meta.url).href) as typeof TweetNode

await runSmoke(sdk)

const proxied = sdk.createClient({
  keys: ['key'],
  proxy: 'http://127.0.0.1:1',
})
if (!proxied)
  throw new Error('createClient({ proxy }) failed on Bun')

const server = createServer((_request, response) => {
  response.end('ok')
})
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
const port = typeof address === 'object' && address
  ? address.port
  : 1

try {
  const client = nodeSdk.createProxyFetch('http://127.0.0.1:1')
  let rejected = false
  try {
    await client.request({ url: `http://127.0.0.1:${port}`, timeout: 3000 })
  }
  catch {
    rejected = true
  }
  if (!rejected)
    throw new Error('Bun fetch ignored the proxy and went direct')
}
finally {
  await new Promise<void>(resolve => server.close(() => resolve()))
}

console.log('bun runtime smoke passed')
