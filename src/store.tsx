import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from './api'
import type { Cuadre } from './cuadre'
import type { CapitalInicial, CompraInsumo, FormaPago, Insumo, MovimientoCaja, Receta, Pedido, TipoMovimiento, Venta } from './types'

interface StoreCtx {
  ready: boolean
  error: string | null
  refresh: () => Promise<void>
  insumos: Insumo[]
  recetas: Receta[]
  pedidos: Pedido[]
  compras: CompraInsumo[]
  ventas: Venta[]
  capital: CapitalInicial | null
  movimientos: MovimientoCaja[]
  cuadres: Cuadre[]
  addInsumo: (data: Omit<Insumo, 'id'> & { formaPago?: FormaPago; fechaCompra?: string }) => Promise<void>
  updateInsumo: (id: string, data: Partial<Insumo>) => Promise<void>
  deleteInsumo: (id: string) => Promise<void>
  registrarCompra: (id: string, cantidad: number, costoPorUnidad: number, formaPago: FormaPago, fecha: string) => Promise<void>
  addReceta: (data: Omit<Receta, 'id' | 'vecesVendido'>) => Promise<void>
  updateReceta: (id: string, data: Partial<Receta>) => Promise<void>
  deleteReceta: (id: string) => Promise<void>
  addPedido: (data: Omit<Pedido, 'id'>) => Promise<void>
  updatePedido: (id: string, data: Partial<Pedido>) => Promise<void>
  updateEstadoPedido: (id: string, estado: Pedido['estado']) => Promise<void>
  deletePedido: (id: string) => Promise<void>
  registrarVenta: (data: {
    fecha: string
    efectivo: number
    transferencia: number
    pedidoId?: string
    pedido?: Omit<Pedido, 'id'>
  }) => Promise<void>
  guardarCapital: (data: { efectivo: number; transferencia: number; fecha: string }) => Promise<void>
  addMovimiento: (data: { tipo: TipoMovimiento; concepto: string; efectivo: number; transferencia: number; fecha: string }) => Promise<void>
  deleteMovimiento: (id: string) => Promise<void>
  cerrarCuadre: (data: {
    fecha: string
    realEfectivo: number
    realTransferencia: number
    gananciaCapitalEfectivo: number
    gananciaCapitalTransferencia: number
  }) => Promise<void>
  calcularCostoReceta: (recetaId: string) => number
}

const Store = createContext<StoreCtx>(null!)

function clearLegacyStorage() {
  try {
    localStorage.removeItem('dc_insumos')
    localStorage.removeItem('dc_recetas')
    localStorage.removeItem('dc_pedidos')
  } catch {
    // ignore
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [compras, setCompras] = useState<CompraInsumo[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [capital, setCapital] = useState<CapitalInicial | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([])
  const [cuadres, setCuadres] = useState<Cuadre[]>([])

  const refresh = useCallback(async () => {
    const data = await api.bootstrap()
    setInsumos(data.insumos)
    setRecetas(data.recetas)
    setPedidos(data.pedidos)
    setCompras(data.compras ?? [])
    setVentas(data.ventas ?? [])
    setCapital(data.capital ?? null)
    setMovimientos(data.movimientos ?? [])
    setCuadres(data.cuadres ?? [])
    setError(null)
  }, [])

  useEffect(() => {
    clearLegacyStorage()
    refresh()
      .catch(err => setError(err instanceof Error ? err.message : 'No se pudo cargar la base de datos'))
      .finally(() => setReady(true))
  }, [refresh])

  const addInsumo = async (data: Omit<Insumo, 'id'> & { formaPago?: FormaPago; fechaCompra?: string }) => {
    const created = await api.createInsumo(data)
    setInsumos(p => [...p, created])
    if (created.cantidad > 0 && data.formaPago) {
      setCompras(await api.listCompras())
    }
  }

  const updateInsumo = async (id: string, data: Partial<Insumo>) => {
    const updated = await api.updateInsumo(id, data)
    setInsumos(p => p.map(i => i.id === id ? updated : i))
  }

  const deleteInsumo = async (id: string) => {
    await api.deleteInsumo(id)
    setInsumos(p => p.filter(i => i.id !== id))
  }

  const registrarCompra = async (id: string, cantidad: number, costo: number, formaPago: FormaPago, fecha: string) => {
    const { insumo, compra } = await api.registrarCompra(id, cantidad, costo, formaPago, fecha)
    setInsumos(p => p.map(i => i.id === id ? insumo : i))
    setCompras(p => [compra, ...p])
  }

  const addReceta = async (data: Omit<Receta, 'id' | 'vecesVendido'>) => {
    const created = await api.createReceta(data)
    setRecetas(p => [...p, created])
  }

  const updateReceta = async (id: string, data: Partial<Receta>) => {
    const updated = await api.updateReceta(id, data)
    setRecetas(p => p.map(r => r.id === id ? updated : r))
  }

  const deleteReceta = async (id: string) => {
    await api.deleteReceta(id)
    setRecetas(p => p.filter(r => r.id !== id))
  }

  const addPedido = async (data: Omit<Pedido, 'id'>) => {
    const created = await api.createPedido(data)
    setPedidos(p => [created, ...p])
    setInsumos(await api.listInsumos())
    const sold = created.estado === 'entregado'
    if (sold) {
      setRecetas(p => p.map(r => {
        const qty = created.items.filter(i => i.recetaId === r.id).reduce((s, i) => s + i.cantidad, 0)
        return qty ? { ...r, vecesVendido: r.vecesVendido + qty } : r
      }))
    }
  }

  const updatePedido = async (id: string, data: Partial<Pedido>) => {
    const updated = await api.updatePedido(id, data)
    setPedidos(p => p.map(o => o.id === id ? updated : o))
    setInsumos(await api.listInsumos())
  }

  const updateEstadoPedido = async (id: string, estado: Pedido['estado']) => {
    const previous = pedidos.find(o => o.id === id)
    const updated = await api.updateEstadoPedido(id, estado)
    setPedidos(p => p.map(o => o.id === id ? updated : o))
    setInsumos(await api.listInsumos())
    if (previous && previous.estado !== 'entregado' && updated.estado === 'entregado') {
      setRecetas(p => p.map(r => {
        const qty = updated.items.filter(i => i.recetaId === r.id).reduce((s, i) => s + i.cantidad, 0)
        return qty ? { ...r, vecesVendido: r.vecesVendido + qty } : r
      }))
    }
  }

  const deletePedido = async (id: string) => {
    await api.deletePedido(id)
    setPedidos(p => p.filter(o => o.id !== id))
    setVentas(p => p.map(v => v.pedidoId === id ? { ...v, pedidoId: null } : v))
    setInsumos(await api.listInsumos())
  }

  const registrarVenta = async (data: {
    fecha: string
    efectivo: number
    transferencia: number
    pedidoId?: string
    pedido?: Omit<Pedido, 'id'>
  }) => {
    const { venta, pedido } = await api.registrarVenta(data)
    setVentas(p => [venta, ...p.filter(v => v.id !== venta.id)])
    setPedidos(p => {
      const exists = p.some(o => o.id === pedido.id)
      return exists ? p.map(o => o.id === pedido.id ? pedido : o) : [pedido, ...p]
    })
    setInsumos(await api.listInsumos())
    if (pedido.estado === 'entregado') {
      setRecetas(p => p.map(r => {
        const qty = pedido.items.filter(i => i.recetaId === r.id).reduce((s, i) => s + i.cantidad, 0)
        return qty ? { ...r, vecesVendido: r.vecesVendido + qty } : r
      }))
    }
  }

  const guardarCapital = async (data: { efectivo: number; transferencia: number; fecha: string }) => {
    setCapital(await api.guardarCapital(data))
  }

  const addMovimiento = async (data: { tipo: TipoMovimiento; concepto: string; efectivo: number; transferencia: number; fecha: string }) => {
    const created = await api.crearMovimiento(data)
    setMovimientos(p => [created, ...p])
  }

  const deleteMovimiento = async (id: string) => {
    await api.deleteMovimiento(id)
    setMovimientos(p => p.filter(m => m.id !== id))
  }

  const cerrarCuadre = async (data: {
    fecha: string
    realEfectivo: number
    realTransferencia: number
    gananciaCapitalEfectivo: number
    gananciaCapitalTransferencia: number
  }) => {
    const saved = await api.cerrarCuadre(data)
    setCuadres(p => [saved, ...p.filter(c => c.fecha !== saved.fecha)])
  }

  const calcularCostoReceta = (recetaId: string): number => {
    const receta = recetas.find(r => r.id === recetaId)
    if (!receta) return 0
    return receta.ingredientes.reduce((total, ing) => {
      const insumo = insumos.find(i => i.id === ing.insumoId)
      return total + (insumo ? ing.cantidad * insumo.costoPorUnidad : 0)
    }, 0)
  }

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#0f0804' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#c4882a' }}>Cargando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: '#0f0804' }}>
        <p style={{ color: '#c44a4a', fontSize: 15 }}>{error}</p>
        <button
          onClick={() => { setReady(false); refresh().catch(err => setError(err instanceof Error ? err.message : 'Error')).finally(() => setReady(true)) }}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: '#c4882a', color: '#0f0804' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <Store.Provider value={{
      ready, error, refresh,
      insumos, recetas, pedidos, compras, ventas, capital, movimientos, cuadres,
      addInsumo, updateInsumo, deleteInsumo, registrarCompra,
      addReceta, updateReceta, deleteReceta,
      addPedido, updatePedido, updateEstadoPedido, deletePedido, registrarVenta,
      guardarCapital, addMovimiento, deleteMovimiento, cerrarCuadre,
      calcularCostoReceta,
    }}>
      {children}
    </Store.Provider>
  )
}

export const useStore = () => useContext(Store)
