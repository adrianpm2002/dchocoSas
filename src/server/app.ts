import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import type { EstadoPedido } from '../types'
import * as auth from './auth-repo'
import type { Db } from './db'
import { ensureSchema } from './db'
import * as repo from './repo'

const ESTADOS: EstadoPedido[] = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado']
const SESSION_COOKIE = 'dc_session'
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/

type AppEnv = { Variables: { user: auth.AuthUser } }

function cookieOpts(c: { req: { url: string } }) {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax' as const,
    secure: new URL(c.req.url).protocol === 'https:',
  }
}

function setSessionCookie(c: Context, token: string, expiresAt: Date) {
  setCookie(c, SESSION_COOKIE, token, {
    ...cookieOpts(c),
    expires: expiresAt,
  })
}

function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, cookieOpts(c))
}

function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function readPassword(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function createApp(db: Db) {
  const app = new Hono<AppEnv>()

  app.use('/api/*', async (_c, next) => {
    await ensureSchema(db)
    await next()
  })

  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
    console.error(err)
    return c.json({ error: err instanceof Error ? err.message : 'Error interno' }, 500)
  })

  app.get('/api/health', c => c.json({ ok: true }))

  app.get('/api/auth/status', async c => {
    const setupRequired = (await auth.countUsers(db)) === 0
    const token = getCookie(c, SESSION_COOKIE)
    const user = token ? await auth.getSessionUser(db, token) : null
    return c.json({
      setupRequired,
      authenticated: Boolean(user),
      username: user?.username ?? null,
    })
  })

  app.post('/api/auth/setup', async c => {
    if (await auth.countUsers(db)) throw new HTTPException(403, { message: 'Ya existe un usuario' })
    const body = await c.req.json<{ username?: string; password?: string }>()
    const username = normalizeUsername(body.username)
    const password = readPassword(body.password)
    if (!USERNAME_RE.test(username)) {
      throw new HTTPException(400, { message: 'Usuario: 3-32 caracteres, letras, números, punto, guion o _' })
    }
    if (password.length < 8) throw new HTTPException(400, { message: 'La contraseña debe tener al menos 8 caracteres' })
    const user = await auth.createUser(db, username, password)
    const session = await auth.createSession(db, user.id)
    setSessionCookie(c, session.id, session.expiresAt)
    return c.json({ username: user.username }, 201)
  })

  app.post('/api/auth/login', async c => {
    const body = await c.req.json<{ username?: string; password?: string }>()
    const username = normalizeUsername(body.username)
    const password = readPassword(body.password)
    const user = await auth.authenticate(db, username, password)
    if (!user) throw new HTTPException(401, { message: 'Usuario o contraseña incorrectos' })
    await auth.deleteExpiredSessions(db)
    const session = await auth.createSession(db, user.id)
    setSessionCookie(c, session.id, session.expiresAt)
    return c.json({ username: user.username })
  })

  app.post('/api/auth/logout', async c => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) await auth.deleteSession(db, token)
    clearSessionCookie(c)
    return c.body(null, 204)
  })

  app.use('/api/*', async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (!token) throw new HTTPException(401, { message: 'No autorizado' })
    const user = await auth.getSessionUser(db, token)
    if (!user) throw new HTTPException(401, { message: 'No autorizado' })
    c.set('user', user)
    await next()
  })

  app.get('/api/bootstrap', async c => c.json(await repo.bootstrap(db)))

  app.get('/api/insumos', async c => c.json(await repo.listInsumos(db)))

  app.post('/api/insumos', async c => {
    const body = await c.req.json<repo.InsumoInput>()
    if (!body?.nombre?.trim()) throw new HTTPException(400, { message: 'El nombre es obligatorio' })
    const created = await repo.createInsumo(db, {
      nombre: body.nombre.trim(),
      cantidad: Number(body.cantidad) || 0,
      unidad: body.unidad || 'g',
      costoPorUnidad: Number(body.costoPorUnidad) || 0,
      vecesComprado: Number(body.vecesComprado) || 0,
      costoTotal: Number(body.costoTotal) || 0,
      stockMinimo: Number(body.stockMinimo) || 0,
    })
    return c.json(created, 201)
  })

  app.patch('/api/insumos/:id', async c => {
    const updated = await repo.updateInsumo(db, c.req.param('id'), await c.req.json())
    if (!updated) throw new HTTPException(404, { message: 'Insumo no encontrado' })
    return c.json(updated)
  })

  app.delete('/api/insumos/:id', async c => {
    const ok = await repo.deleteInsumo(db, c.req.param('id'))
    if (!ok) throw new HTTPException(404, { message: 'Insumo no encontrado' })
    return c.body(null, 204)
  })

  app.post('/api/insumos/:id/compra', async c => {
    const body = await c.req.json<{ cantidad: number; costoPorUnidad: number }>()
    const cantidad = Number(body.cantidad)
    if (!(cantidad > 0)) throw new HTTPException(400, { message: 'La cantidad debe ser mayor a 0' })
    const updated = await repo.registrarCompra(db, c.req.param('id'), cantidad, Number(body.costoPorUnidad) || 0)
    if (!updated) throw new HTTPException(404, { message: 'Insumo no encontrado' })
    return c.json(updated)
  })

  app.get('/api/recetas', async c => c.json(await repo.listRecetas(db)))

  app.post('/api/recetas', async c => {
    const body = await c.req.json<repo.RecetaInput>()
    if (!body?.nombre?.trim()) throw new HTTPException(400, { message: 'El nombre es obligatorio' })
    const created = await repo.createReceta(db, normalizeReceta(body))
    return c.json(created, 201)
  })

  app.patch('/api/recetas/:id', async c => {
    const body = await c.req.json<Partial<repo.RecetaInput>>()
    if (typeof body.nombre === 'string') body.nombre = body.nombre.trim()
    const updated = await repo.updateReceta(db, c.req.param('id'), body)
    if (!updated) throw new HTTPException(404, { message: 'Receta no encontrada' })
    return c.json(updated)
  })

  app.delete('/api/recetas/:id', async c => {
    const ok = await repo.deleteReceta(db, c.req.param('id'))
    if (!ok) throw new HTTPException(404, { message: 'Receta no encontrada' })
    return c.body(null, 204)
  })

  app.get('/api/pedidos', async c => c.json(await repo.listPedidos(db)))

  app.post('/api/pedidos', async c => {
    const body = await c.req.json<repo.PedidoInput>()
    if (!body?.cliente?.nombre?.trim()) throw new HTTPException(400, { message: 'El cliente es obligatorio' })
    if (!body.items?.length) throw new HTTPException(400, { message: 'El pedido necesita al menos un producto' })
    const created = await repo.createPedido(db, normalizePedido(body))
    return c.json(created, 201)
  })

  app.patch('/api/pedidos/:id', async c => {
    const updated = await repo.updatePedido(db, c.req.param('id'), await c.req.json())
    if (!updated) throw new HTTPException(404, { message: 'Pedido no encontrado' })
    return c.json(updated)
  })

  app.patch('/api/pedidos/:id/estado', async c => {
    const body = await c.req.json<{ estado: EstadoPedido }>()
    if (!ESTADOS.includes(body.estado)) throw new HTTPException(400, { message: 'Estado inválido' })
    const updated = await repo.updateEstadoPedido(db, c.req.param('id'), body.estado)
    if (!updated) throw new HTTPException(404, { message: 'Pedido no encontrado' })
    return c.json(updated)
  })

  app.delete('/api/pedidos/:id', async c => {
    const ok = await repo.deletePedido(db, c.req.param('id'))
    if (!ok) throw new HTTPException(404, { message: 'Pedido no encontrado' })
    return c.body(null, 204)
  })

  return app
}

function normalizeReceta(body: repo.RecetaInput): repo.RecetaInput {
  return {
    nombre: body.nombre.trim(),
    descripcion: body.descripcion?.trim() ?? '',
    precioVenta: Number(body.precioVenta) || 0,
    activa: body.activa !== false,
    ingredientes: Array.isArray(body.ingredientes) ? body.ingredientes : [],
    vecesVendido: body.vecesVendido,
  }
}

function normalizePedido(body: repo.PedidoInput): repo.PedidoInput {
  return {
    cliente: {
      nombre: body.cliente.nombre.trim(),
      telefono: body.cliente.telefono?.trim() ?? '',
      direccion: body.cliente.direccion?.trim() ?? '',
    },
    items: body.items,
    decoraciones: body.decoraciones ?? [],
    descuento: Number(body.descuento) || 0,
    precioFinal: Number(body.precioFinal) || 0,
    estado: ESTADOS.includes(body.estado) ? body.estado : 'pendiente',
    fechaCreacion: body.fechaCreacion,
    fechaEntrega: body.fechaEntrega,
    notas: body.notas?.trim() ?? '',
  }
}
