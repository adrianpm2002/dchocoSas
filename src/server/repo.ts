import type { Decoracion, EstadoPedido, IngredienteReceta, Insumo, ItemPedido, Pedido, Receta } from '../types'
import type { Db, SqlParams } from './db'
import { newId } from './db'

type InsumoRow = {
  id: string
  nombre: string
  cantidad: number
  unidad: string
  costo_por_unidad: number
  veces_comprado: number
  costo_total: number
  stock_minimo: number
}

type RecetaRow = {
  id: string
  nombre: string
  descripcion: string
  precio_venta: number
  veces_vendido: number
  activa: number
}

type IngredienteRow = {
  receta_id: string
  insumo_id: string
  cantidad: number
}

type PedidoRow = {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_direccion: string
  descuento: number
  envio: number
  precio_final: number
  estado: EstadoPedido
  fecha_creacion: string
  fecha_entrega: string
  notas: string
}

type PedidoItemRow = {
  pedido_id: string
  receta_id: string
  cantidad: number
  precio_unitario: number
}

type DecoracionRow = {
  pedido_id: string
  nombre: string
  precio: number
}

export type InsumoInput = Omit<Insumo, 'id'>
export type RecetaInput = Omit<Receta, 'id' | 'vecesVendido'> & { vecesVendido?: number }
export type PedidoInput = Omit<Pedido, 'id'>

function mapInsumo(row: InsumoRow): Insumo {
  return {
    id: row.id,
    nombre: row.nombre,
    cantidad: Number(row.cantidad),
    unidad: row.unidad,
    costoPorUnidad: Number(row.costo_por_unidad),
    vecesComprado: Number(row.veces_comprado),
    costoTotal: Number(row.costo_total),
    stockMinimo: Number(row.stock_minimo),
  }
}

function mapIngrediente(row: IngredienteRow): IngredienteReceta {
  return { insumoId: row.insumo_id, cantidad: Number(row.cantidad) }
}

function mapReceta(row: RecetaRow, ingredientes: IngredienteReceta[]): Receta {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    ingredientes,
    precioVenta: Number(row.precio_venta),
    vecesVendido: Number(row.veces_vendido),
    activa: Boolean(row.activa),
  }
}

function mapPedido(row: PedidoRow, items: ItemPedido[], decoraciones: Decoracion[]): Pedido {
  return {
    id: row.id,
    cliente: {
      nombre: row.cliente_nombre,
      telefono: row.cliente_telefono,
      direccion: row.cliente_direccion,
    },
    items,
    decoraciones,
    descuento: Number(row.descuento),
    envio: Number(row.envio) || 0,
    precioFinal: Number(row.precio_final),
    estado: row.estado,
    fechaCreacion: row.fecha_creacion,
    fechaEntrega: row.fecha_entrega,
    notas: row.notas,
  }
}

export async function listInsumos(db: Db): Promise<Insumo[]> {
  const rows = await db.all<InsumoRow>('SELECT * FROM insumos ORDER BY nombre COLLATE NOCASE')
  return rows.map(mapInsumo)
}

export async function getInsumo(db: Db, id: string): Promise<Insumo | null> {
  const row = await db.first<InsumoRow>('SELECT * FROM insumos WHERE id = ?', [id])
  return row ? mapInsumo(row) : null
}

export async function createInsumo(db: Db, data: InsumoInput, id = newId()): Promise<Insumo> {
  await db.run(
    `INSERT INTO insumos (id, nombre, cantidad, unidad, costo_por_unidad, veces_comprado, costo_total, stock_minimo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.nombre,
      data.cantidad,
      data.unidad,
      data.costoPorUnidad,
      data.vecesComprado,
      data.costoTotal,
      data.stockMinimo,
    ],
  )
  return (await getInsumo(db, id))!
}

export async function updateInsumo(db: Db, id: string, data: Partial<InsumoInput>): Promise<Insumo | null> {
  const current = await getInsumo(db, id)
  if (!current) return null
  const next = { ...current, ...data }
  await db.run(
    `UPDATE insumos
     SET nombre = ?, cantidad = ?, unidad = ?, costo_por_unidad = ?, veces_comprado = ?, costo_total = ?, stock_minimo = ?
     WHERE id = ?`,
    [next.nombre, next.cantidad, next.unidad, next.costoPorUnidad, next.vecesComprado, next.costoTotal, next.stockMinimo, id],
  )
  return getInsumo(db, id)
}

export async function deleteInsumo(db: Db, id: string): Promise<boolean> {
  const current = await getInsumo(db, id)
  if (!current) return false
  await db.run('DELETE FROM receta_ingredientes WHERE insumo_id = ?', [id])
  await db.run('DELETE FROM insumos WHERE id = ?', [id])
  return true
}

export async function registrarCompra(db: Db, id: string, cantidad: number, costoPorUnidad: number): Promise<Insumo | null> {
  const current = await getInsumo(db, id)
  if (!current) return null
  return updateInsumo(db, id, {
    cantidad: current.cantidad + cantidad,
    vecesComprado: current.vecesComprado + 1,
    costoPorUnidad,
    costoTotal: current.costoTotal + cantidad * costoPorUnidad,
  })
}

async function ingredientesByReceta(db: Db): Promise<Map<string, IngredienteReceta[]>> {
  const rows = await db.all<IngredienteRow>('SELECT receta_id, insumo_id, cantidad FROM receta_ingredientes')
  const map = new Map<string, IngredienteReceta[]>()
  for (const row of rows) {
    const list = map.get(row.receta_id) ?? []
    list.push(mapIngrediente(row))
    map.set(row.receta_id, list)
  }
  return map
}

export async function listRecetas(db: Db): Promise<Receta[]> {
  const [rows, ingredientes] = await Promise.all([
    db.all<RecetaRow>('SELECT * FROM recetas ORDER BY nombre COLLATE NOCASE'),
    ingredientesByReceta(db),
  ])
  return rows.map(row => mapReceta(row, ingredientes.get(row.id) ?? []))
}

export async function getReceta(db: Db, id: string): Promise<Receta | null> {
  const row = await db.first<RecetaRow>('SELECT * FROM recetas WHERE id = ?', [id])
  if (!row) return null
  const ings = await db.all<IngredienteRow>(
    'SELECT receta_id, insumo_id, cantidad FROM receta_ingredientes WHERE receta_id = ?',
    [id],
  )
  return mapReceta(row, ings.map(mapIngrediente))
}

function recetaIngredientStatements(recetaId: string, ingredientes: IngredienteReceta[]) {
  return [
    { sql: 'DELETE FROM receta_ingredientes WHERE receta_id = ?', params: [recetaId] as SqlParams },
    ...ingredientes.map(ing => ({
      sql: 'INSERT INTO receta_ingredientes (receta_id, insumo_id, cantidad) VALUES (?, ?, ?)',
      params: [recetaId, ing.insumoId, ing.cantidad] as SqlParams,
    })),
  ]
}

export async function createReceta(db: Db, data: RecetaInput, id = newId()): Promise<Receta> {
  await db.batch([
    {
      sql: `INSERT INTO recetas (id, nombre, descripcion, precio_venta, veces_vendido, activa)
            VALUES (?, ?, ?, ?, ?, ?)`,
      params: [id, data.nombre, data.descripcion, data.precioVenta, data.vecesVendido ?? 0, data.activa ? 1 : 0],
    },
    ...recetaIngredientStatements(id, data.ingredientes).slice(1),
  ])
  return (await getReceta(db, id))!
}

export async function updateReceta(db: Db, id: string, data: Partial<RecetaInput>): Promise<Receta | null> {
  const current = await getReceta(db, id)
  if (!current) return null
  const next = { ...current, ...data }
  await db.batch([
    {
      sql: `UPDATE recetas
            SET nombre = ?, descripcion = ?, precio_venta = ?, veces_vendido = ?, activa = ?
            WHERE id = ?`,
      params: [next.nombre, next.descripcion, next.precioVenta, next.vecesVendido, next.activa ? 1 : 0, id],
    },
    ...recetaIngredientStatements(id, next.ingredientes),
  ])
  return getReceta(db, id)
}

export async function deleteReceta(db: Db, id: string): Promise<boolean> {
  const current = await getReceta(db, id)
  if (!current) return false
  await db.run('DELETE FROM recetas WHERE id = ?', [id])
  return true
}

async function nestPedidos(db: Db, rows: PedidoRow[]): Promise<Pedido[]> {
  if (rows.length === 0) return []
  const [itemRows, decoRows] = await Promise.all([
    db.all<PedidoItemRow>('SELECT pedido_id, receta_id, cantidad, precio_unitario FROM pedido_items'),
    db.all<DecoracionRow>('SELECT pedido_id, nombre, precio FROM pedido_decoraciones'),
  ])
  const items = new Map<string, ItemPedido[]>()
  for (const row of itemRows) {
    const list = items.get(row.pedido_id) ?? []
    list.push({ recetaId: row.receta_id, cantidad: Number(row.cantidad), precioUnitario: Number(row.precio_unitario) })
    items.set(row.pedido_id, list)
  }
  const decos = new Map<string, Decoracion[]>()
  for (const row of decoRows) {
    const list = decos.get(row.pedido_id) ?? []
    list.push({ nombre: row.nombre, precio: Number(row.precio) })
    decos.set(row.pedido_id, list)
  }
  return rows.map(row => mapPedido(row, items.get(row.id) ?? [], decos.get(row.id) ?? []))
}

export async function listPedidos(db: Db): Promise<Pedido[]> {
  const rows = await db.all<PedidoRow>('SELECT * FROM pedidos ORDER BY fecha_creacion DESC, id DESC')
  return nestPedidos(db, rows)
}

export async function getPedido(db: Db, id: string): Promise<Pedido | null> {
  const row = await db.first<PedidoRow>('SELECT * FROM pedidos WHERE id = ?', [id])
  if (!row) return null
  const [found] = await nestPedidos(db, [row])
  return found ?? null
}

function pedidoChildStatements(id: string, items: ItemPedido[], decoraciones: Decoracion[]) {
  return [
    { sql: 'DELETE FROM pedido_items WHERE pedido_id = ?', params: [id] as SqlParams },
    { sql: 'DELETE FROM pedido_decoraciones WHERE pedido_id = ?', params: [id] as SqlParams },
    ...items.map(item => ({
      sql: 'INSERT INTO pedido_items (pedido_id, receta_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
      params: [id, item.recetaId, item.cantidad, item.precioUnitario] as SqlParams,
    })),
    ...decoraciones.map(deco => ({
      sql: 'INSERT INTO pedido_decoraciones (pedido_id, nombre, precio) VALUES (?, ?, ?)',
      params: [id, deco.nombre, deco.precio] as SqlParams,
    })),
  ]
}

function consumeEstado(estado: EstadoPedido) {
  return estado === 'listo' || estado === 'entregado'
}

const stockReady = new WeakMap<Db, Promise<void>>()

export function ensureStockTracking(db: Db): Promise<void> {
  let pending = stockReady.get(db)
  if (!pending) {
    pending = migrateStockColumn(db)
    stockReady.set(db, pending)
  }
  return pending
}

async function addColumnIfMissing(db: Db, sql: string) {
  try {
    await db.run(sql)
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    if (!/duplicate column/i.test(message)) throw err
  }
}

async function migrateStockColumn(db: Db) {
  await addColumnIfMissing(db, 'ALTER TABLE pedidos ADD COLUMN stock_descontado INTEGER NOT NULL DEFAULT 0')
  await addColumnIfMissing(db, 'ALTER TABLE pedidos ADD COLUMN envio REAL NOT NULL DEFAULT 0')
  const pendientes = await db.all<{ id: string }>(
    "SELECT id FROM pedidos WHERE IFNULL(stock_descontado, 0) = 0 AND estado IN ('listo', 'entregado')",
  )
  for (const row of pendientes) {
    const pedido = await getPedido(db, row.id)
    if (!pedido) continue
    await ajustarStock(db, pedido.items, -1)
    await setStockFlag(db, pedido.id, true)
  }
}

async function getStockFlag(db: Db, id: string): Promise<boolean> {
  const row = await db.first<{ stock_descontado: number }>('SELECT stock_descontado FROM pedidos WHERE id = ?', [id])
  return Boolean(row?.stock_descontado)
}

async function setStockFlag(db: Db, id: string, value: boolean) {
  await db.run('UPDATE pedidos SET stock_descontado = ? WHERE id = ?', [value ? 1 : 0, id])
}

async function ajustarStock(db: Db, items: ItemPedido[], factor: number) {
  const recetas = await listRecetas(db)
  const consumo = new Map<string, number>()
  for (const item of items) {
    const receta = recetas.find(r => r.id === item.recetaId)
    if (!receta) continue
    for (const ing of receta.ingredientes) {
      consumo.set(ing.insumoId, (consumo.get(ing.insumoId) ?? 0) + ing.cantidad * item.cantidad)
    }
  }
  for (const [insumoId, qty] of consumo) {
    if (!qty) continue
    await db.run('UPDATE insumos SET cantidad = cantidad + ? WHERE id = ?', [factor * qty, insumoId])
  }
}

async function syncStock(
  db: Db,
  id: string,
  prevItems: ItemPedido[],
  nextItems: ItemPedido[],
  nextEstado: EstadoPedido,
  wasDeducted: boolean,
) {
  const sigueConsumiendo = wasDeducted && consumeEstado(nextEstado)
  const mismosItems = prevItems.length === nextItems.length
    && [...prevItems].map(i => `${i.recetaId}:${i.cantidad}`).sort().join('|')
      === [...nextItems].map(i => `${i.recetaId}:${i.cantidad}`).sort().join('|')
  if (sigueConsumiendo && mismosItems) return

  if (wasDeducted) await ajustarStock(db, prevItems, 1)
  if (consumeEstado(nextEstado)) {
    await ajustarStock(db, nextItems, -1)
    await setStockFlag(db, id, true)
  } else {
    await setStockFlag(db, id, false)
  }
}

export async function createPedido(db: Db, data: PedidoInput, id = newId()): Promise<Pedido> {
  await db.batch([
    {
      sql: `INSERT INTO pedidos (
              id, cliente_nombre, cliente_telefono, cliente_direccion, descuento, envio, precio_final,
              estado, fecha_creacion, fecha_entrega, notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        data.cliente.nombre,
        data.cliente.telefono,
        data.cliente.direccion,
        data.descuento,
        data.envio,
        data.precioFinal,
        data.estado,
        data.fechaCreacion,
        data.fechaEntrega,
        data.notas,
      ],
    },
    ...pedidoChildStatements(id, data.items, data.decoraciones).slice(2),
  ])
  await syncStock(db, id, [], data.items, data.estado, false)
  if (data.estado === 'entregado') {
    await incrementVentas(db, data.items)
  }
  return (await getPedido(db, id))!
}

export async function updatePedido(db: Db, id: string, data: Partial<PedidoInput>): Promise<Pedido | null> {
  const current = await getPedido(db, id)
  if (!current) return null
  const wasDeducted = await getStockFlag(db, id)
  const next: Pedido = {
    ...current,
    ...data,
    cliente: { ...current.cliente, ...data.cliente },
    items: data.items ?? current.items,
    decoraciones: data.decoraciones ?? current.decoraciones,
  }
  await db.batch([
    {
      sql: `UPDATE pedidos
            SET cliente_nombre = ?, cliente_telefono = ?, cliente_direccion = ?, descuento = ?, envio = ?, precio_final = ?,
                estado = ?, fecha_creacion = ?, fecha_entrega = ?, notas = ?
            WHERE id = ?`,
      params: [
        next.cliente.nombre,
        next.cliente.telefono,
        next.cliente.direccion,
        next.descuento,
        next.envio,
        next.precioFinal,
        next.estado,
        next.fechaCreacion,
        next.fechaEntrega,
        next.notas,
        id,
      ],
    },
    ...pedidoChildStatements(id, next.items, next.decoraciones),
  ])
  await syncStock(db, id, current.items, next.items, next.estado, wasDeducted)
  if (current.estado !== 'entregado' && next.estado === 'entregado') {
    await incrementVentas(db, next.items)
  }
  return getPedido(db, id)
}

export async function updateEstadoPedido(db: Db, id: string, estado: EstadoPedido): Promise<Pedido | null> {
  return updatePedido(db, id, { estado })
}

export async function deletePedido(db: Db, id: string): Promise<boolean> {
  const current = await getPedido(db, id)
  if (!current) return false
  if (await getStockFlag(db, id)) await ajustarStock(db, current.items, 1)
  await db.run('DELETE FROM pedidos WHERE id = ?', [id])
  return true
}

async function incrementVentas(db: Db, items: ItemPedido[]) {
  for (const item of items) {
    await db.run('UPDATE recetas SET veces_vendido = veces_vendido + ? WHERE id = ?', [item.cantidad, item.recetaId])
  }
}

export async function bootstrap(db: Db) {
  const [insumos, recetas, pedidos] = await Promise.all([listInsumos(db), listRecetas(db), listPedidos(db)])
  return { insumos, recetas, pedidos }
}
