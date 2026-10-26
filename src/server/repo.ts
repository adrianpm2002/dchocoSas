import { aplicarConteo, calcularDia, type Cuadre, type ParCaja } from '../cuadre'
import type { CapitalInicial, CompraInsumo, Decoracion, EstadoPedido, FormaPago, IngredienteReceta, Insumo, ItemPedido, MovimientoCaja, OrigenVenta, Pedido, Receta, TipoMovimiento, Venta } from '../types'
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
export type CompraInput = {
  cantidad: number
  costoPorUnidad: number
  formaPago: FormaPago
  fecha: string
}

type CompraRow = {
  id: string
  insumo_id: string | null
  insumo_nombre: string
  cantidad: number
  unidad: string
  costo_por_unidad: number
  total: number
  forma_pago: string
  fecha: string
  creado_en: string
}

export function isFormaPago(value: unknown): value is FormaPago {
  return value === 'efectivo' || value === 'transferencia'
}

function mapCompra(row: CompraRow): CompraInsumo {
  return {
    id: row.id,
    insumoId: row.insumo_id || null,
    insumoNombre: row.insumo_nombre,
    cantidad: Number(row.cantidad),
    unidad: row.unidad,
    costoPorUnidad: Number(row.costo_por_unidad),
    total: Number(row.total),
    formaPago: isFormaPago(row.forma_pago) ? row.forma_pago : 'efectivo',
    fecha: row.fecha,
    creadoEn: row.creado_en,
  }
}

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
  await db.run('UPDATE compras_insumos SET insumo_id = NULL WHERE insumo_id = ?', [id])
  await db.run('DELETE FROM receta_ingredientes WHERE insumo_id = ?', [id])
  await db.run('DELETE FROM insumos WHERE id = ?', [id])
  return true
}

export async function insertCompra(
  db: Db,
  data: {
    insumoId: string
    insumoNombre: string
    cantidad: number
    unidad: string
    costoPorUnidad: number
    formaPago: FormaPago
    fecha: string
  },
  id = newId(),
): Promise<CompraInsumo> {
  const total = data.cantidad * data.costoPorUnidad
  const creadoEn = new Date().toISOString()
  await db.run(
    `INSERT INTO compras_insumos (
      id, insumo_id, insumo_nombre, cantidad, unidad, costo_por_unidad, total, forma_pago, fecha, creado_en
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.insumoId,
      data.insumoNombre,
      data.cantidad,
      data.unidad,
      data.costoPorUnidad,
      total,
      data.formaPago,
      data.fecha,
      creadoEn,
    ],
  )
  return {
    id,
    insumoId: data.insumoId,
    insumoNombre: data.insumoNombre,
    cantidad: data.cantidad,
    unidad: data.unidad,
    costoPorUnidad: data.costoPorUnidad,
    total,
    formaPago: data.formaPago,
    fecha: data.fecha,
    creadoEn,
  }
}

export async function listCompras(db: Db): Promise<CompraInsumo[]> {
  const rows = await db.all<CompraRow>(
    'SELECT * FROM compras_insumos ORDER BY fecha DESC, creado_en DESC',
  )
  return rows.map(mapCompra)
}

export async function registrarCompra(db: Db, id: string, data: CompraInput): Promise<{ insumo: Insumo; compra: CompraInsumo } | null> {
  const current = await getInsumo(db, id)
  if (!current) return null
  const insumo = await updateInsumo(db, id, {
    cantidad: current.cantidad + data.cantidad,
    vecesComprado: current.vecesComprado + 1,
    costoPorUnidad: data.costoPorUnidad,
    costoTotal: current.costoTotal + data.cantidad * data.costoPorUnidad,
  })
  if (!insumo) return null
  const compra = await insertCompra(db, {
    insumoId: insumo.id,
    insumoNombre: insumo.nombre,
    cantidad: data.cantidad,
    unidad: insumo.unidad,
    costoPorUnidad: data.costoPorUnidad,
    formaPago: data.formaPago,
    fecha: data.fecha,
  })
  return { insumo, compra }
}

const comprasReady = new WeakMap<Db, Promise<void>>()

export function ensureComprasInsumos(db: Db): Promise<void> {
  let pending = comprasReady.get(db)
  if (!pending) {
    pending = db.batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS compras_insumos (
          id TEXT PRIMARY KEY,
          insumo_id TEXT,
          insumo_nombre TEXT NOT NULL,
          cantidad REAL NOT NULL,
          unidad TEXT NOT NULL DEFAULT '',
          costo_por_unidad REAL NOT NULL DEFAULT 0,
          total REAL NOT NULL DEFAULT 0,
          forma_pago TEXT NOT NULL,
          fecha TEXT NOT NULL,
          creado_en TEXT NOT NULL
        )`,
      },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras_insumos(fecha)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_compras_insumo ON compras_insumos(insumo_id)' },
    ])
    comprasReady.set(db, pending)
  }
  return pending
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
  await db.run('UPDATE ventas SET pedido_id = NULL WHERE pedido_id = ?', [id])
  await db.run('DELETE FROM pedidos WHERE id = ?', [id])
  return true
}

async function incrementVentas(db: Db, items: ItemPedido[]) {
  for (const item of items) {
    await db.run('UPDATE recetas SET veces_vendido = veces_vendido + ? WHERE id = ?', [item.cantidad, item.recetaId])
  }
}

type VentaRow = {
  id: string
  pedido_id: string | null
  cliente_nombre: string
  origen: string
  total: number
  efectivo: number
  transferencia: number
  fecha: string
  creado_en: string
}

export type VentaInput = {
  fecha: string
  efectivo: number
  transferencia: number
  pedidoId?: string
  pedido?: PedidoInput
}

function roundMoney(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function mapVenta(row: VentaRow): Venta {
  return {
    id: row.id,
    pedidoId: row.pedido_id || null,
    clienteNombre: row.cliente_nombre,
    origen: row.origen === 'mostrador' ? 'mostrador' : 'pedido',
    total: Number(row.total),
    efectivo: Number(row.efectivo),
    transferencia: Number(row.transferencia),
    fecha: row.fecha,
    creadoEn: row.creado_en,
  }
}

export async function listVentas(db: Db): Promise<Venta[]> {
  const rows = await db.all<VentaRow>('SELECT * FROM ventas ORDER BY fecha DESC, creado_en DESC')
  return rows.map(mapVenta)
}

export async function getVentaByPedido(db: Db, pedidoId: string): Promise<Venta | null> {
  const row = await db.first<VentaRow>('SELECT * FROM ventas WHERE pedido_id = ?', [pedidoId])
  return row ? mapVenta(row) : null
}

async function insertVenta(
  db: Db,
  data: {
    pedidoId: string
    clienteNombre: string
    origen: OrigenVenta
    total: number
    efectivo: number
    transferencia: number
    fecha: string
  },
  id = newId(),
): Promise<Venta> {
  const creadoEn = new Date().toISOString()
  await db.run(
    `INSERT INTO ventas (
      id, pedido_id, cliente_nombre, origen, total, efectivo, transferencia, fecha, creado_en
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.pedidoId,
      data.clienteNombre,
      data.origen,
      data.total,
      data.efectivo,
      data.transferencia,
      data.fecha,
      creadoEn,
    ],
  )
  return {
    id,
    pedidoId: data.pedidoId,
    clienteNombre: data.clienteNombre,
    origen: data.origen,
    total: data.total,
    efectivo: data.efectivo,
    transferencia: data.transferencia,
    fecha: data.fecha,
    creadoEn,
  }
}

export async function registrarVenta(db: Db, data: VentaInput): Promise<{ venta: Venta; pedido: Pedido }> {
  const efectivo = roundMoney(data.efectivo)
  const transferencia = roundMoney(data.transferencia)
  if (efectivo < 0 || transferencia < 0) throw new Error('Los montos no pueden ser negativos')
  if (efectivo === 0 && transferencia === 0) throw new Error('Indicá cuánto se pagó en efectivo y/o transferencia')

  let pedido: Pedido | null
  let origen: OrigenVenta

  if (data.pedidoId) {
    origen = 'pedido'
    pedido = await getPedido(db, data.pedidoId)
    if (!pedido) throw new Error('Pedido no encontrado')
  } else if (data.pedido) {
    origen = 'mostrador'
    if (!data.pedido.cliente.nombre.trim()) throw new Error('El cliente es obligatorio')
    if (!data.pedido.items.length) throw new Error('La venta necesita al menos un producto')
    pedido = await createPedido(db, { ...data.pedido, estado: 'pendiente' })
  } else {
    throw new Error('Seleccioná un pedido o armá una venta de mostrador')
  }

  const prev = await getVentaByPedido(db, pedido.id)
  if (prev && pedido.estado !== 'entregado') {
    const updated = await updateEstadoPedido(db, pedido.id, 'entregado')
    if (!updated) throw new Error('No se pudo marcar el pedido como entregado')
    return { venta: prev, pedido: updated }
  }
  if (prev) throw new Error('Este pedido ya tiene una venta registrada')
  if (pedido.estado === 'entregado') throw new Error('Este pedido ya fue entregado')

  const total = roundMoney(pedido.precioFinal)
  if (Math.abs(efectivo + transferencia - total) > 0.015) {
    throw new Error('Efectivo + transferencia debe coincidir con el total')
  }

  const venta = await insertVenta(db, {
    pedidoId: pedido.id,
    clienteNombre: pedido.cliente.nombre,
    origen,
    total,
    efectivo,
    transferencia,
    fecha: data.fecha,
  })
  const entregado = await updateEstadoPedido(db, pedido.id, 'entregado')
  if (!entregado) throw new Error('La venta se guardó pero no se pudo marcar el pedido como entregado')
  return { venta, pedido: entregado }
}

const ventasReady = new WeakMap<Db, Promise<void>>()

export function ensureVentas(db: Db): Promise<void> {
  let pending = ventasReady.get(db)
  if (!pending) {
    pending = db.batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS ventas (
          id TEXT PRIMARY KEY,
          pedido_id TEXT,
          cliente_nombre TEXT NOT NULL,
          origen TEXT NOT NULL,
          total REAL NOT NULL DEFAULT 0,
          efectivo REAL NOT NULL DEFAULT 0,
          transferencia REAL NOT NULL DEFAULT 0,
          fecha TEXT NOT NULL,
          creado_en TEXT NOT NULL
        )`,
      },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_ventas_pedido ON ventas(pedido_id)' },
    ])
    ventasReady.set(db, pending)
  }
  return pending
}

const CAPITAL_ID = 'caja'
const TIPOS_MOVIMIENTO: TipoMovimiento[] = ['ingreso', 'gasto', 'extraccion']

type CapitalRow = {
  id: string
  efectivo: number
  transferencia: number
  fecha: string
  actualizado_en: string
}

type MovimientoRow = {
  id: string
  tipo: string
  concepto: string
  efectivo: number
  transferencia: number
  fecha: string
  creado_en: string
}

function mapCapital(row: CapitalRow): CapitalInicial {
  return {
    efectivo: Number(row.efectivo) || 0,
    transferencia: Number(row.transferencia) || 0,
    fecha: row.fecha,
    actualizadoEn: row.actualizado_en,
  }
}

function mapMovimiento(row: MovimientoRow): MovimientoCaja {
  return {
    id: row.id,
    tipo: TIPOS_MOVIMIENTO.includes(row.tipo as TipoMovimiento) ? row.tipo as TipoMovimiento : 'gasto',
    concepto: row.concepto,
    efectivo: Number(row.efectivo) || 0,
    transferencia: Number(row.transferencia) || 0,
    fecha: row.fecha,
    creadoEn: row.creado_en,
  }
}

export function isTipoMovimiento(value: unknown): value is TipoMovimiento {
  return value === 'ingreso' || value === 'gasto' || value === 'extraccion'
}

export async function getCapital(db: Db): Promise<CapitalInicial | null> {
  const row = await db.first<CapitalRow>('SELECT * FROM economia_capital WHERE id = ?', [CAPITAL_ID])
  return row ? mapCapital(row) : null
}

export async function upsertCapital(
  db: Db,
  data: { efectivo: number; transferencia: number; fecha: string },
): Promise<CapitalInicial> {
  const actualizadoEn = new Date().toISOString()
  const efectivo = roundMoney(data.efectivo)
  const transferencia = roundMoney(data.transferencia)
  if (efectivo < 0 || transferencia < 0) throw new Error('El capital no puede ser negativo')
  await db.run(
    `INSERT INTO economia_capital (id, efectivo, transferencia, fecha, actualizado_en)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET efectivo = excluded.efectivo, transferencia = excluded.transferencia,
       fecha = excluded.fecha, actualizado_en = excluded.actualizado_en`,
    [CAPITAL_ID, efectivo, transferencia, data.fecha, actualizadoEn],
  )
  return { efectivo, transferencia, fecha: data.fecha, actualizadoEn }
}

export async function listMovimientos(db: Db): Promise<MovimientoCaja[]> {
  const rows = await db.all<MovimientoRow>('SELECT * FROM movimientos_caja ORDER BY fecha DESC, creado_en DESC')
  return rows.map(mapMovimiento)
}

export async function createMovimiento(
  db: Db,
  data: { tipo: TipoMovimiento; concepto: string; efectivo: number; transferencia: number; fecha: string },
  id = newId(),
): Promise<MovimientoCaja> {
  const efectivo = roundMoney(data.efectivo)
  const transferencia = roundMoney(data.transferencia)
  if (efectivo < 0 || transferencia < 0) throw new Error('Los montos no pueden ser negativos')
  if (efectivo === 0 && transferencia === 0) throw new Error('Indicá un monto en efectivo y/o transferencia')
  const concepto = data.concepto.trim()
  if (!concepto) throw new Error('El concepto es obligatorio')
  const creadoEn = new Date().toISOString()
  await db.run(
    `INSERT INTO movimientos_caja (id, tipo, concepto, efectivo, transferencia, fecha, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.tipo, concepto, efectivo, transferencia, data.fecha, creadoEn],
  )
  return { id, tipo: data.tipo, concepto, efectivo, transferencia, fecha: data.fecha, creadoEn }
}

export async function deleteMovimiento(db: Db, id: string): Promise<boolean> {
  const row = await db.first<{ id: string }>('SELECT id FROM movimientos_caja WHERE id = ?', [id])
  if (!row) return false
  await db.run('DELETE FROM movimientos_caja WHERE id = ?', [id])
  return true
}

const economiaReady = new WeakMap<Db, Promise<void>>()

export function ensureEconomia(db: Db): Promise<void> {
  let pending = economiaReady.get(db)
  if (!pending) {
    pending = db.batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS economia_capital (
          id TEXT PRIMARY KEY,
          efectivo REAL NOT NULL DEFAULT 0,
          transferencia REAL NOT NULL DEFAULT 0,
          fecha TEXT NOT NULL,
          actualizado_en TEXT NOT NULL
        )`,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS movimientos_caja (
          id TEXT PRIMARY KEY,
          tipo TEXT NOT NULL,
          concepto TEXT NOT NULL,
          efectivo REAL NOT NULL DEFAULT 0,
          transferencia REAL NOT NULL DEFAULT 0,
          fecha TEXT NOT NULL,
          creado_en TEXT NOT NULL
        )`,
      },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_caja(fecha)' },
    ])
    economiaReady.set(db, pending)
  }
  return pending
}

type CuadreRow = {
  id: string
  fecha: string
  origen_apertura: string
  apertura_efectivo: number
  apertura_transferencia: number
  ingresos_efectivo: number
  ingresos_transferencia: number
  costo_efectivo: number
  costo_transferencia: number
  ganancia_efectivo: number
  ganancia_transferencia: number
  otros_ingresos_efectivo: number
  otros_ingresos_transferencia: number
  gastos_efectivo: number
  gastos_transferencia: number
  extracciones_efectivo: number
  extracciones_transferencia: number
  esperado_efectivo: number
  esperado_transferencia: number
  real_efectivo: number
  real_transferencia: number
  diferencia_efectivo: number
  diferencia_transferencia: number
  sin_ganancia_efectivo: number
  sin_ganancia_transferencia: number
  ganancia_capital_efectivo: number
  ganancia_capital_transferencia: number
  cierre_efectivo: number
  cierre_transferencia: number
  cerrado: number
  creado_en: string
  actualizado_en: string
}

function parFrom(e: number, t: number): ParCaja {
  return { efectivo: Number(e) || 0, transferencia: Number(t) || 0 }
}

function mapCuadre(row: CuadreRow): Cuadre {
  return {
    id: row.id,
    fecha: row.fecha,
    origenApertura: row.origen_apertura === 'cierre_anterior' ? 'cierre_anterior' : 'capital',
    apertura: parFrom(row.apertura_efectivo, row.apertura_transferencia),
    ingresos: parFrom(row.ingresos_efectivo, row.ingresos_transferencia),
    costo: parFrom(row.costo_efectivo, row.costo_transferencia),
    ganancia: parFrom(row.ganancia_efectivo, row.ganancia_transferencia),
    otrosIngresos: parFrom(row.otros_ingresos_efectivo, row.otros_ingresos_transferencia),
    gastos: parFrom(row.gastos_efectivo, row.gastos_transferencia),
    extracciones: parFrom(row.extracciones_efectivo, row.extracciones_transferencia),
    esperado: parFrom(row.esperado_efectivo, row.esperado_transferencia),
    real: parFrom(row.real_efectivo, row.real_transferencia),
    diferencia: parFrom(row.diferencia_efectivo, row.diferencia_transferencia),
    sinGanancia: parFrom(row.sin_ganancia_efectivo, row.sin_ganancia_transferencia),
    gananciaCapital: parFrom(row.ganancia_capital_efectivo, row.ganancia_capital_transferencia),
    cierre: parFrom(row.cierre_efectivo, row.cierre_transferencia),
    cerrado: Boolean(row.cerrado),
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  }
}

export async function listCuadres(db: Db): Promise<Cuadre[]> {
  const rows = await db.all<CuadreRow>('SELECT * FROM cuadres ORDER BY fecha DESC')
  return rows.map(mapCuadre)
}

export async function getCuadreByFecha(db: Db, fecha: string): Promise<Cuadre | null> {
  const row = await db.first<CuadreRow>('SELECT * FROM cuadres WHERE fecha = ?', [fecha])
  return row ? mapCuadre(row) : null
}

export async function getUltimoCierreAntes(db: Db, fecha: string): Promise<Cuadre | null> {
  const row = await db.first<CuadreRow>(
    'SELECT * FROM cuadres WHERE cerrado = 1 AND fecha < ? ORDER BY fecha DESC LIMIT 1',
    [fecha],
  )
  return row ? mapCuadre(row) : null
}

function costoPedidoLocal(pedido: Pedido, recetas: Receta[], insumos: Insumo[]) {
  return pedido.items.reduce((s, item) => {
    const receta = recetas.find(r => r.id === item.recetaId)
    if (!receta) return s
    const unit = receta.ingredientes.reduce((t, ing) => {
      const insumo = insumos.find(i => i.id === ing.insumoId)
      return t + (insumo ? ing.cantidad * insumo.costoPorUnidad : 0)
    }, 0)
    return s + item.cantidad * unit
  }, 0)
}

export async function cerrarCuadre(
  db: Db,
  data: {
    fecha: string
    realEfectivo: number
    realTransferencia: number
    gananciaCapitalEfectivo: number
    gananciaCapitalTransferencia: number
  },
): Promise<Cuadre> {
  const existente = await getCuadreByFecha(db, data.fecha)
  if (existente?.cerrado) throw new Error('Este día ya está cerrado')

  const [capital, previo, ventas, pedidos, compras, movimientos, recetas, insumos] = await Promise.all([
    getCapital(db),
    getUltimoCierreAntes(db, data.fecha),
    listVentas(db),
    listPedidos(db),
    listCompras(db),
    listMovimientos(db),
    listRecetas(db),
    listInsumos(db),
  ])
  if (!capital && !previo) throw new Error('Definí el capital inicial en Economía antes del primer cuadre')

  const base = calcularDia({
    fecha: data.fecha,
    capital,
    previo: previo ? { cierre: previo.cierre, fecha: previo.fecha } : null,
    ventas,
    pedidos,
    compras,
    movimientos,
    costoPedido: p => costoPedidoLocal(p, recetas, insumos),
  })
  const cierre = aplicarConteo(
    base,
    { efectivo: data.realEfectivo, transferencia: data.realTransferencia },
    { efectivo: data.gananciaCapitalEfectivo, transferencia: data.gananciaCapitalTransferencia },
  )
  const id = existente?.id ?? newId()
  const now = new Date().toISOString()
  const creadoEn = existente?.creadoEn ?? now
  await db.run(
    `INSERT INTO cuadres (
      id, fecha, origen_apertura,
      apertura_efectivo, apertura_transferencia,
      ingresos_efectivo, ingresos_transferencia,
      costo_efectivo, costo_transferencia,
      ganancia_efectivo, ganancia_transferencia,
      otros_ingresos_efectivo, otros_ingresos_transferencia,
      gastos_efectivo, gastos_transferencia,
      extracciones_efectivo, extracciones_transferencia,
      esperado_efectivo, esperado_transferencia,
      real_efectivo, real_transferencia,
      diferencia_efectivo, diferencia_transferencia,
      sin_ganancia_efectivo, sin_ganancia_transferencia,
      ganancia_capital_efectivo, ganancia_capital_transferencia,
      cierre_efectivo, cierre_transferencia,
      cerrado, creado_en, actualizado_en
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(fecha) DO UPDATE SET
      origen_apertura = excluded.origen_apertura,
      apertura_efectivo = excluded.apertura_efectivo,
      apertura_transferencia = excluded.apertura_transferencia,
      ingresos_efectivo = excluded.ingresos_efectivo,
      ingresos_transferencia = excluded.ingresos_transferencia,
      costo_efectivo = excluded.costo_efectivo,
      costo_transferencia = excluded.costo_transferencia,
      ganancia_efectivo = excluded.ganancia_efectivo,
      ganancia_transferencia = excluded.ganancia_transferencia,
      otros_ingresos_efectivo = excluded.otros_ingresos_efectivo,
      otros_ingresos_transferencia = excluded.otros_ingresos_transferencia,
      gastos_efectivo = excluded.gastos_efectivo,
      gastos_transferencia = excluded.gastos_transferencia,
      extracciones_efectivo = excluded.extracciones_efectivo,
      extracciones_transferencia = excluded.extracciones_transferencia,
      esperado_efectivo = excluded.esperado_efectivo,
      esperado_transferencia = excluded.esperado_transferencia,
      real_efectivo = excluded.real_efectivo,
      real_transferencia = excluded.real_transferencia,
      diferencia_efectivo = excluded.diferencia_efectivo,
      diferencia_transferencia = excluded.diferencia_transferencia,
      sin_ganancia_efectivo = excluded.sin_ganancia_efectivo,
      sin_ganancia_transferencia = excluded.sin_ganancia_transferencia,
      ganancia_capital_efectivo = excluded.ganancia_capital_efectivo,
      ganancia_capital_transferencia = excluded.ganancia_capital_transferencia,
      cierre_efectivo = excluded.cierre_efectivo,
      cierre_transferencia = excluded.cierre_transferencia,
      cerrado = 1,
      actualizado_en = excluded.actualizado_en`,
    [
      id, data.fecha, base.origenApertura,
      base.apertura.efectivo, base.apertura.transferencia,
      base.ingresos.efectivo, base.ingresos.transferencia,
      base.costo.efectivo, base.costo.transferencia,
      base.ganancia.efectivo, base.ganancia.transferencia,
      base.otrosIngresos.efectivo, base.otrosIngresos.transferencia,
      base.gastos.efectivo, base.gastos.transferencia,
      base.extracciones.efectivo, base.extracciones.transferencia,
      base.esperado.efectivo, base.esperado.transferencia,
      cierre.real.efectivo, cierre.real.transferencia,
      cierre.diferencia.efectivo, cierre.diferencia.transferencia,
      cierre.sinGanancia.efectivo, cierre.sinGanancia.transferencia,
      cierre.gananciaCapital.efectivo, cierre.gananciaCapital.transferencia,
      cierre.cierre.efectivo, cierre.cierre.transferencia,
      creadoEn, now,
    ],
  )
  return (await getCuadreByFecha(db, data.fecha))!
}

const cuadresReady = new WeakMap<Db, Promise<void>>()

export function ensureCuadres(db: Db): Promise<void> {
  let pending = cuadresReady.get(db)
  if (!pending) {
    pending = db.batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS cuadres (
          id TEXT PRIMARY KEY,
          fecha TEXT NOT NULL UNIQUE,
          origen_apertura TEXT NOT NULL,
          apertura_efectivo REAL NOT NULL DEFAULT 0,
          apertura_transferencia REAL NOT NULL DEFAULT 0,
          ingresos_efectivo REAL NOT NULL DEFAULT 0,
          ingresos_transferencia REAL NOT NULL DEFAULT 0,
          costo_efectivo REAL NOT NULL DEFAULT 0,
          costo_transferencia REAL NOT NULL DEFAULT 0,
          ganancia_efectivo REAL NOT NULL DEFAULT 0,
          ganancia_transferencia REAL NOT NULL DEFAULT 0,
          otros_ingresos_efectivo REAL NOT NULL DEFAULT 0,
          otros_ingresos_transferencia REAL NOT NULL DEFAULT 0,
          gastos_efectivo REAL NOT NULL DEFAULT 0,
          gastos_transferencia REAL NOT NULL DEFAULT 0,
          extracciones_efectivo REAL NOT NULL DEFAULT 0,
          extracciones_transferencia REAL NOT NULL DEFAULT 0,
          esperado_efectivo REAL NOT NULL DEFAULT 0,
          esperado_transferencia REAL NOT NULL DEFAULT 0,
          real_efectivo REAL NOT NULL DEFAULT 0,
          real_transferencia REAL NOT NULL DEFAULT 0,
          diferencia_efectivo REAL NOT NULL DEFAULT 0,
          diferencia_transferencia REAL NOT NULL DEFAULT 0,
          sin_ganancia_efectivo REAL NOT NULL DEFAULT 0,
          sin_ganancia_transferencia REAL NOT NULL DEFAULT 0,
          ganancia_capital_efectivo REAL NOT NULL DEFAULT 0,
          ganancia_capital_transferencia REAL NOT NULL DEFAULT 0,
          cierre_efectivo REAL NOT NULL DEFAULT 0,
          cierre_transferencia REAL NOT NULL DEFAULT 0,
          cerrado INTEGER NOT NULL DEFAULT 1,
          creado_en TEXT NOT NULL,
          actualizado_en TEXT NOT NULL
        )`,
      },
      { sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_cuadres_fecha ON cuadres(fecha)' },
    ])
    cuadresReady.set(db, pending)
  }
  return pending
}

export async function bootstrap(db: Db) {
  const [insumos, recetas, pedidos, compras, ventas, capital, movimientos, cuadres] = await Promise.all([
    listInsumos(db),
    listRecetas(db),
    listPedidos(db),
    listCompras(db),
    listVentas(db),
    getCapital(db),
    listMovimientos(db),
    listCuadres(db),
  ])
  return { insumos, recetas, pedidos, compras, ventas, capital, movimientos, cuadres }
}
