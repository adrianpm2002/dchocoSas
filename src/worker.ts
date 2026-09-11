import { createApp } from './server/app'
import { createD1, type D1Database } from './server/db'

export type Env = {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return createApp(createD1(env.DB)).fetch(request)
  },
}
