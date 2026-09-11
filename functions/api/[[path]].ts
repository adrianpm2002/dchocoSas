import { createApp } from '../../src/server/app'
import { createD1, type D1Database } from '../../src/server/db'

type PagesContext = {
  request: Request
  env: { DB: D1Database }
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const app = createApp(createD1(context.env.DB))
  return app.fetch(context.request)
}
