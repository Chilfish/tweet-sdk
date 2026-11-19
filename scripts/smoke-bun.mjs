import { createServer } from 'node:http'
import { createClient } from '../dist/index.js'
import { createProxyFetch } from '../dist/node.js'
import { runSmoke } from './smoke-runtime.mjs'

await runSmoke()

const proxied = createClient({
  keys: ['key'],
  proxy: 'http://127.0.0.1:1',
})
if (!proxied)
  throw new Error('createClient({ proxy }) failed on Bun')

const server = createServer((_request, response) => {
  response.end('ok')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
const port = typeof address === 'object' && address
  ? address.port
  : 1

try {
  const client = createProxyFetch('http://127.0.0.1:1')
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
  await new Promise(resolve => server.close(() => resolve()))
}

console.log('bun runtime smoke passed')
