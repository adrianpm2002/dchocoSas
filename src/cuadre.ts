import { roundMoney } from './economia'
import type { CapitalInicial, CompraInsumo, MovimientoCaja, Pedido, Venta } from './types'

export type ParCaja = { efectivo: number; transferencia: number }

export type OrigenApertura = 'capital' | 'cierre_anterior'

export interface Cuadre {
  id: string
  fecha: string
  origenApertura: OrigenApertura
  apertura: ParCaja
  ingresos: ParCaja
  costo: ParCaja
  ganancia: ParCaja
  otrosIngresos: ParCaja
  gastos: ParCaja
  extracciones: ParCaja
  esperado: ParCaja
  real: ParCaja
  diferencia: ParCaja
  sinGanancia: ParCaja
  gananciaCapital: ParCaja
  cierre: ParCaja
  cerrado: boolean
  creadoEn: string
  actualizadoEn: string
}

function par(efectivo = 0, transferencia = 0): ParCaja {
  return { efectivo: roundMoney(efectivo), transferencia: roundMoney(transferencia) }
}

export function sumaPar(a: ParCaja, b: ParCaja): ParCaja {
  return par(a.efectivo + b.efectivo, a.transferencia + b.transferencia)
}

export function restaPar(a: ParCaja, b: ParCaja): ParCaja {
  return par(a.efectivo - b.efectivo, a.transferencia - b.transferencia)
}

export function totalPar(p: ParCaja) {
  return roundMoney(p.efectivo + p.transferencia)
}

function splitMonto(monto: number, efectivo: number, transferencia: number): ParCaja {
  const tot = efectivo + transferencia
  if (tot <= 0) return par(0, 0)
  const parteE = roundMoney(monto * (efectivo / tot))
  return par(parteE, monto - parteE)
}

export function calcularDia(opts: {
  fecha: string
  capital: CapitalInicial | null
  previo: { cierre: ParCaja; fecha: string } | null
  ventas: Venta[]
  pedidos: Pedido[]
  compras: CompraInsumo[]
  movimientos: MovimientoCaja[]
  costoPedido: (pedido: Pedido) => number
}): Omit<Cuadre, 'id' | 'real' | 'diferencia' | 'sinGanancia' | 'gananciaCapital' | 'cierre' | 'cerrado' | 'creadoEn' | 'actualizadoEn'> {
  const { fecha, capital, previo, ventas, pedidos, compras, movimientos, costoPedido } = opts

  let apertura = par()
  let origenApertura: OrigenApertura = 'capital'
  if (previo) {
    apertura = par(previo.cierre.efectivo, previo.cierre.transferencia)
    origenApertura = 'cierre_anterior'
  } else if (capital) {
    apertura = par(capital.efectivo, capital.transferencia)
  }

  const ventasDia = ventas.filter(v => v.fecha === fecha)
  let ingresos = par()
  let costo = par()
  let ganancia = par()
  for (const v of ventasDia) {
    ingresos = sumaPar(ingresos, par(v.efectivo, v.transferencia))
    const pedido = v.pedidoId ? pedidos.find(p => p.id === v.pedidoId) : undefined
    const costoVenta = pedido ? costoPedido(pedido) : 0
    const costoPago = splitMonto(costoVenta, v.efectivo, v.transferencia)
    costo = sumaPar(costo, costoPago)
    ganancia = sumaPar(ganancia, restaPar(par(v.efectivo, v.transferencia), costoPago))
  }

  const otrosIngresos = movimientos
    .filter(m => m.fecha === fecha && m.tipo === 'ingreso')
    .reduce((s, m) => sumaPar(s, par(m.efectivo, m.transferencia)), par())

  const comprasDia = compras.filter(c => c.fecha === fecha)
  const gastosCompras = par(
    comprasDia.filter(c => c.formaPago === 'efectivo').reduce((s, c) => s + c.total, 0),
    comprasDia.filter(c => c.formaPago === 'transferencia').reduce((s, c) => s + c.total, 0),
  )
  const gastosMov = movimientos
    .filter(m => m.fecha === fecha && m.tipo === 'gasto')
    .reduce((s, m) => sumaPar(s, par(m.efectivo, m.transferencia)), par())
  const gastos = sumaPar(gastosCompras, gastosMov)
  const extracciones = movimientos
    .filter(m => m.fecha === fecha && m.tipo === 'extraccion')
    .reduce((s, m) => sumaPar(s, par(m.efectivo, m.transferencia)), par())

  const esperado = restaPar(restaPar(sumaPar(sumaPar(apertura, ingresos), otrosIngresos), gastos), extracciones)

  return {
    fecha,
    origenApertura,
    apertura,
    ingresos,
    costo,
    ganancia,
    otrosIngresos,
    gastos,
    extracciones,
    esperado,
  }
}

export function aplicarConteo(
  base: ReturnType<typeof calcularDia>,
  real: ParCaja,
  gananciaCapital: ParCaja,
): Pick<Cuadre, 'real' | 'diferencia' | 'sinGanancia' | 'gananciaCapital' | 'cierre'> {
  const realPar = par(Math.max(0, real.efectivo), Math.max(0, real.transferencia))
  const diferencia = restaPar(realPar, base.esperado)
  const sinGanancia = restaPar(realPar, base.ganancia)
  const ganCap = par(
    clamp(gananciaCapital.efectivo, 0, Math.max(0, base.ganancia.efectivo)),
    clamp(gananciaCapital.transferencia, 0, Math.max(0, base.ganancia.transferencia)),
  )
  const cierre = sumaPar(sinGanancia, ganCap)
  return { real: realPar, diferencia, sinGanancia, gananciaCapital: ganCap, cierre }
}

function clamp(n: number, min: number, max: number) {
  return roundMoney(Math.min(max, Math.max(min, n)))
}
