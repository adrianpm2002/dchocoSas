import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { createApp } from './app'
import { createLocalSqlite } from './sqlite-local'

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(chunk as Buffer))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function handleApi(
  app: ReturnType<typeof createApp>,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const host = req.headers.host || 'localhost'
  const url = new URL(req.url || '/', `http://${host}`)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  const init: RequestInit = { method: req.method, headers }
  if (req.method && !['GET', 'HEAD'].includes(req.method)) {
    const body = await readBody(req)
    if (body.length) {
      init.body = new Uint8Array(body)
      ;(init as RequestInit & { duplex: 'half' }).duplex = 'half'
    }
  }

  const response = await app.fetch(new Request(url, init))
  res.statusCode = response.status
  const cookies: string[] = []
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') cookies.push(value)
    else res.setHeader(key, value)
  })
  if (cookies.length) res.setHeader('Set-Cookie', cookies)
  const buf = Buffer.from(await response.arrayBuffer())
  res.end(buf)
}

export function sqliteApiPlugin(): Plugin {
  const db = createLocalSqlite()
  const app = createApp(db)

  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api')) return next()
    try {
      await handleApi(app, req, res)
    } catch (error) {
      console.error(error)
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Error interno' }))
      }
    }
  }

  return {
    name: 'dchoco-sqlite-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
