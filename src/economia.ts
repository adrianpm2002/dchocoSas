import type { CapitalInicial, CompraInsumo, MovimientoCaja, Venta } from './types'

export function roundMoney(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function desdeFecha(capital: CapitalInicial | null) {
  return capital?.fecha ?? '0000-00-00'
}

function enPeriodo(fecha: string, capital: CapitalInicial | null) {
  return fecha >= desdeFecha(capital)
}

export type LedgerItem = {
  id: string
  fecha: string
  tipo: 'capital' | 'venta' | 'compra' | 'ingreso' | 'gasto' | 'extraccion'
  concepto: string
  efectivo: number
  transferencia: number
}

const VACIO = {
  capitalEfectivo: 0,
  capitalTransferencia: 0,
  ventasEfectivo: 0,
  ventasTransferencia: 0,
  comprasEfectivo: 0,
  comprasTransferencia: 0,
  ingresosEfectivo: 0,
  ingresosTransferencia: 0,
  gastosEfectivo: 0,
  gastosTransferencia: 0,
  extraccionesEfectivo: 0,
  extraccionesTransferencia: 0,
  efectivo: 0,
  transferencia: 0,
  total: 0,
}

export function resumenCaja(
  capital: CapitalInicial | null,
  ventas: Venta[],
  compras: CompraInsumo[],
  movimientos: MovimientoCaja[],
) {
  if (!capital) return VACIO
  const ventasFiltradas = ventas.filter(v => enPeriodo(v.fecha, capital))
  const comprasFiltradas = compras.filter(c => enPeriodo(c.fecha, capital))
  const movsFiltrados = movimientos.filter(m => enPeriodo(m.fecha, capital))

  const ventasE = roundMoney(ventasFiltradas.reduce((s, v) => s + v.efectivo, 0))
  const ventasT = roundMoney(ventasFiltradas.reduce((s, v) => s + v.transferencia, 0))
  const comprasE = roundMoney(comprasFiltradas.filter(c => c.formaPago === 'efectivo').reduce((s, c) => s + c.total, 0))
  const comprasT = roundMoney(comprasFiltradas.filter(c => c.formaPago === 'transferencia').reduce((s, c) => s + c.total, 0))
  const ingresosE = roundMoney(movsFiltrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.efectivo, 0))
  const ingresosT = roundMoney(movsFiltrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.transferencia, 0))
  const gastosE = roundMoney(movsFiltrados.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.efectivo, 0))
  const gastosT = roundMoney(movsFiltrados.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.transferencia, 0))
  const extrE = roundMoney(movsFiltrados.filter(m => m.tipo === 'extraccion').reduce((s, m) => s + m.efectivo, 0))
  const extrT = roundMoney(movsFiltrados.filter(m => m.tipo === 'extraccion').reduce((s, m) => s + m.transferencia, 0))

  const capE = roundMoney(capital?.efectivo ?? 0)
  const capT = roundMoney(capital?.transferencia ?? 0)

  const efectivo = roundMoney(capE + ventasE - comprasE + ingresosE - gastosE - extrE)
  const transferencia = roundMoney(capT + ventasT - comprasT + ingresosT - gastosT - extrT)

  return {
    capitalEfectivo: capE,
    capitalTransferencia: capT,
    ventasEfectivo: ventasE,
    ventasTransferencia: ventasT,
    comprasEfectivo: comprasE,
    comprasTransferencia: comprasT,
    ingresosEfectivo: ingresosE,
    ingresosTransferencia: ingresosT,
    gastosEfectivo: gastosE,
    gastosTransferencia: gastosT,
    extraccionesEfectivo: extrE,
    extraccionesTransferencia: extrT,
    efectivo,
    transferencia,
    total: roundMoney(efectivo + transferencia),
  }
}

export function armarLibro(
  capital: CapitalInicial | null,
  ventas: Venta[],
  compras: CompraInsumo[],
  movimientos: MovimientoCaja[],
): LedgerItem[] {
  if (!capital) return []
  const items: LedgerItem[] = []
  if (capital) {
    items.push({
      id: 'capital',
      fecha: capital.fecha,
      tipo: 'capital',
      concepto: 'Capital inicial',
      efectivo: roundMoney(capital.efectivo),
      transferencia: roundMoney(capital.transferencia),
    })
  }
  for (const v of ventas) {
    if (!enPeriodo(v.fecha, capital)) continue
    items.push({
      id: `venta-${v.id}`,
      fecha: v.fecha,
      tipo: 'venta',
      concepto: `Venta · ${v.clienteNombre}`,
      efectivo: roundMoney(v.efectivo),
      transferencia: roundMoney(v.transferencia),
    })
  }
  for (const c of compras) {
    if (!enPeriodo(c.fecha, capital)) continue
    items.push({
      id: `compra-${c.id}`,
      fecha: c.fecha,
      tipo: 'compra',
      concepto: `Compra insumo · ${c.insumoNombre}`,
      efectivo: c.formaPago === 'efectivo' ? -roundMoney(c.total) : 0,
      transferencia: c.formaPago === 'transferencia' ? -roundMoney(c.total) : 0,
    })
  }
  for (const m of movimientos) {
    if (!enPeriodo(m.fecha, capital)) continue
    const sign = m.tipo === 'ingreso' ? 1 : -1
    items.push({
      id: m.id,
      fecha: m.fecha,
      tipo: m.tipo,
      concepto: m.concepto,
      efectivo: sign * roundMoney(m.efectivo),
      transferencia: sign * roundMoney(m.transferencia),
    })
  }
  return items.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.concepto.localeCompare(b.concepto))
}
