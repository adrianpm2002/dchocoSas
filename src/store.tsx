import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Insumo, Receta, Pedido } from './types'

const initialInsumos: Insumo[] = [
  { id: 'i1', nombre: 'Chocolate Oscuro 70%', cantidad: 2500, unidad: 'g', costoPorUnidad: 0.018, vecesComprado: 8, costoTotal: 144.0, stockMinimo: 500 },
  { id: 'i2', nombre: 'Crema de Leche', cantidad: 3000, unidad: 'ml', costoPorUnidad: 0.0045, vecesComprado: 12, costoTotal: 54.0, stockMinimo: 500 },
  { id: 'i3', nombre: 'Azúcar Glass', cantidad: 2000, unidad: 'g', costoPorUnidad: 0.0025, vecesComprado: 6, costoTotal: 15.0, stockMinimo: 200 },
  { id: 'i4', nombre: 'Manteca de Cacao', cantidad: 500, unidad: 'g', costoPorUnidad: 0.08, vecesComprado: 4, costoTotal: 32.0, stockMinimo: 100 },
  { id: 'i5', nombre: 'Almendras', cantidad: 400, unidad: 'g', costoPorUnidad: 0.055, vecesComprado: 5, costoTotal: 22.0, stockMinimo: 100 },
  { id: 'i6', nombre: 'Frambuesas Liofilizadas', cantidad: 80, unidad: 'g', costoPorUnidad: 0.15, vecesComprado: 3, costoTotal: 12.0, stockMinimo: 30 },
  { id: 'i7', nombre: 'Pistacho Molido', cantidad: 150, unidad: 'g', costoPorUnidad: 0.10, vecesComprado: 4, costoTotal: 16.0, stockMinimo: 50 },
  { id: 'i8', nombre: 'Caja de Regalo', cantidad: 15, unidad: 'unidad', costoPorUnidad: 2.50, vecesComprado: 10, costoTotal: 37.5, stockMinimo: 5 },
  { id: 'i9', nombre: 'Papel Celofán', cantidad: 2, unidad: 'rollo', costoPorUnidad: 3.50, vecesComprado: 6, costoTotal: 7.0, stockMinimo: 1 },
  { id: 'i10', nombre: 'Licor de Amaretto', cantidad: 100, unidad: 'ml', costoPorUnidad: 0.05, vecesComprado: 2, costoTotal: 5.0, stockMinimo: 20 },
]

const initialRecetas: Receta[] = [
  {
    id: 'r1', nombre: 'Bombón de Ganache Oscuro', descripcion: 'Clásico bombón de chocolate negro con ganache sedoso',
    ingredientes: [{ insumoId: 'i1', cantidad: 30 }, { insumoId: 'i2', cantidad: 15 }],
    precioVenta: 2.50, vecesVendido: 145, activa: true,
  },
  {
    id: 'r2', nombre: 'Trufa de Frambuesa', descripcion: 'Trufa de chocolate con corazón de frambuesa liofilizada',
    ingredientes: [{ insumoId: 'i1', cantidad: 25 }, { insumoId: 'i2', cantidad: 12 }, { insumoId: 'i6', cantidad: 5 }],
    precioVenta: 3.50, vecesVendido: 98, activa: true,
  },
  {
    id: 'r3', nombre: 'Bombón de Almendra', descripcion: 'Bombón con almendra tostada y caramelo artesanal',
    ingredientes: [{ insumoId: 'i1', cantidad: 25 }, { insumoId: 'i5', cantidad: 8 }, { insumoId: 'i2', cantidad: 8 }],
    precioVenta: 3.00, vecesVendido: 112, activa: true,
  },
  {
    id: 'r4', nombre: 'Bombón de Pistacho', descripcion: 'Bombón de chocolate negro relleno de crema de pistacho',
    ingredientes: [{ insumoId: 'i1', cantidad: 25 }, { insumoId: 'i7', cantidad: 6 }, { insumoId: 'i2', cantidad: 8 }],
    precioVenta: 3.50, vecesVendido: 76, activa: true,
  },
  {
    id: 'r5', nombre: 'Caja Surtida (12 bombones)', descripcion: 'Selección de 12 bombones artesanales en caja de regalo',
    ingredientes: [
      { insumoId: 'i8', cantidad: 1 }, { insumoId: 'i1', cantidad: 120 },
      { insumoId: 'i2', cantidad: 60 }, { insumoId: 'i5', cantidad: 24 },
      { insumoId: 'i6', cantidad: 15 }, { insumoId: 'i7', cantidad: 18 },
    ],
    precioVenta: 32.00, vecesVendido: 45, activa: true,
  },
]

const initialPedidos: Pedido[] = [
  {
    id: 'p1', estado: 'pendiente', fechaCreacion: '2026-09-09', fechaEntrega: '2026-09-12', notas: 'Entregar antes del mediodía',
    cliente: { nombre: 'Ana García', telefono: '+54 9 11 5234-7890', direccion: 'Av. Corrientes 1234, CABA' },
    items: [{ recetaId: 'r5', cantidad: 2, precioUnitario: 32.00 }, { recetaId: 'r2', cantidad: 6, precioUnitario: 3.50 }],
    decoraciones: [{ nombre: 'Lazo de terciopelo', precio: 5.00 }],
    descuento: 0, precioFinal: 90.00,
  },
  {
    id: 'p2', estado: 'en_proceso', fechaCreacion: '2026-09-08', fechaEntrega: '2026-09-11', notas: '',
    cliente: { nombre: 'Carlos Mendoza', telefono: '+54 9 11 6345-8901', direccion: 'Calle Florida 567, CABA' },
    items: [{ recetaId: 'r5', cantidad: 3, precioUnitario: 32.00 }],
    decoraciones: [{ nombre: 'Mensaje grabado en caja', precio: 8.00 }],
    descuento: 0, precioFinal: 104.00,
  },
  {
    id: 'p3', estado: 'listo', fechaCreacion: '2026-09-07', fechaEntrega: '2026-09-10', notas: 'Regalo de aniversario',
    cliente: { nombre: 'María López', telefono: '+54 9 11 7456-9012', direccion: 'Tucumán 890, CABA' },
    items: [{ recetaId: 'r5', cantidad: 1, precioUnitario: 32.00 }, { recetaId: 'r1', cantidad: 6, precioUnitario: 2.50 }],
    decoraciones: [],
    descuento: 0, precioFinal: 47.00,
  },
  {
    id: 'p4', estado: 'entregado', fechaCreacion: '2026-09-04', fechaEntrega: '2026-09-05', notas: '',
    cliente: { nombre: 'Laura Torres', telefono: '+54 9 11 8567-0123', direccion: 'Palermo Soho 234, CABA' },
    items: [{ recetaId: 'r5', cantidad: 2, precioUnitario: 32.00 }],
    decoraciones: [],
    descuento: 0, precioFinal: 64.00,
  },
  {
    id: 'p5', estado: 'entregado', fechaCreacion: '2026-09-02', fechaEntrega: '2026-09-03', notas: 'Cliente VIP, descuento aplicado',
    cliente: { nombre: 'Roberto Silva', telefono: '+54 9 11 9678-1234', direccion: 'Recoleta 456, CABA' },
    items: [{ recetaId: 'r5', cantidad: 5, precioUnitario: 32.00 }],
    decoraciones: [{ nombre: 'Envío expreso', precio: 12.00 }],
    descuento: 10.00, precioFinal: 162.00,
  },
  {
    id: 'p6', estado: 'entregado', fechaCreacion: '2026-09-01', fechaEntrega: '2026-09-01', notas: '',
    cliente: { nombre: 'Carmen Rojas', telefono: '+54 9 11 0789-2345', direccion: 'Belgrano 789, CABA' },
    items: [{ recetaId: 'r3', cantidad: 12, precioUnitario: 3.00 }, { recetaId: 'r1', cantidad: 6, precioUnitario: 2.50 }],
    decoraciones: [],
    descuento: 0, precioFinal: 51.00,
  },
  {
    id: 'p7', estado: 'entregado', fechaCreacion: '2026-08-28', fechaEntrega: '2026-08-29', notas: '',
    cliente: { nombre: 'Jorge Pérez', telefono: '+54 9 11 1890-3456', direccion: 'San Telmo 321, CABA' },
    items: [{ recetaId: 'r5', cantidad: 4, precioUnitario: 32.00 }, { recetaId: 'r4', cantidad: 6, precioUnitario: 3.50 }],
    decoraciones: [{ nombre: 'Tarjeta personalizada', precio: 3.00 }],
    descuento: 5.00, precioFinal: 147.00,
  },
  {
    id: 'p8', estado: 'entregado', fechaCreacion: '2026-08-25', fechaEntrega: '2026-08-26', notas: '',
    cliente: { nombre: 'Valentina Cruz', telefono: '+54 9 11 2901-4567', direccion: 'Almagro 654, CABA' },
    items: [{ recetaId: 'r5', cantidad: 2, precioUnitario: 32.00 }, { recetaId: 'r2', cantidad: 4, precioUnitario: 3.50 }],
    decoraciones: [],
    descuento: 0, precioFinal: 78.00,
  },
]

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

interface StoreCtx {
  insumos: Insumo[]
  recetas: Receta[]
  pedidos: Pedido[]
  addInsumo: (data: Omit<Insumo, 'id'>) => void
  updateInsumo: (id: string, data: Partial<Insumo>) => void
  deleteInsumo: (id: string) => void
  registrarCompra: (id: string, cantidad: number, costoPorUnidad: number) => void
  addReceta: (data: Omit<Receta, 'id' | 'vecesVendido'>) => void
  updateReceta: (id: string, data: Partial<Receta>) => void
  deleteReceta: (id: string) => void
  addPedido: (data: Omit<Pedido, 'id'>) => void
  updatePedido: (id: string, data: Partial<Pedido>) => void
  updateEstadoPedido: (id: string, estado: Pedido['estado']) => void
  deletePedido: (id: string) => void
  calcularCostoReceta: (recetaId: string) => number
}

const Store = createContext<StoreCtx>(null!)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [insumos, setInsumos] = useState<Insumo[]>(() => load('dc_insumos', initialInsumos))
  const [recetas, setRecetas] = useState<Receta[]>(() => load('dc_recetas', initialRecetas))
  const [pedidos, setPedidos] = useState<Pedido[]>(() => load('dc_pedidos', initialPedidos))

  useEffect(() => { localStorage.setItem('dc_insumos', JSON.stringify(insumos)) }, [insumos])
  useEffect(() => { localStorage.setItem('dc_recetas', JSON.stringify(recetas)) }, [recetas])
  useEffect(() => { localStorage.setItem('dc_pedidos', JSON.stringify(pedidos)) }, [pedidos])

  const uid = () => Math.random().toString(36).slice(2, 10)

  const addInsumo = (data: Omit<Insumo, 'id'>) =>
    setInsumos(p => [...p, { id: uid(), ...data }])

  const updateInsumo = (id: string, data: Partial<Insumo>) =>
    setInsumos(p => p.map(i => i.id === id ? { ...i, ...data } : i))

  const deleteInsumo = (id: string) =>
    setInsumos(p => p.filter(i => i.id !== id))

  const registrarCompra = (id: string, cantidad: number, costo: number) =>
    setInsumos(p => p.map(i => i.id === id ? {
      ...i,
      cantidad: i.cantidad + cantidad,
      vecesComprado: i.vecesComprado + 1,
      costoPorUnidad: costo,
      costoTotal: i.costoTotal + cantidad * costo,
    } : i))

  const addReceta = (data: Omit<Receta, 'id' | 'vecesVendido'>) =>
    setRecetas(p => [...p, { id: uid(), vecesVendido: 0, ...data }])

  const updateReceta = (id: string, data: Partial<Receta>) =>
    setRecetas(p => p.map(r => r.id === id ? { ...r, ...data } : r))

  const deleteReceta = (id: string) =>
    setRecetas(p => p.filter(r => r.id !== id))

  const addPedido = (data: Omit<Pedido, 'id'>) =>
    setPedidos(p => [...p, { id: uid(), ...data }])

  const updatePedido = (id: string, data: Partial<Pedido>) =>
    setPedidos(p => p.map(o => o.id === id ? { ...o, ...data } : o))

  const updateEstadoPedido = (id: string, estado: Pedido['estado']) =>
    setPedidos(p => p.map(o => o.id === id ? { ...o, estado } : o))

  const deletePedido = (id: string) =>
    setPedidos(p => p.filter(o => o.id !== id))

  const calcularCostoReceta = (recetaId: string): number => {
    const receta = recetas.find(r => r.id === recetaId)
    if (!receta) return 0
    return receta.ingredientes.reduce((total, ing) => {
      const insumo = insumos.find(i => i.id === ing.insumoId)
      return total + (insumo ? ing.cantidad * insumo.costoPorUnidad : 0)
    }, 0)
  }

  return (
    <Store.Provider value={{
      insumos, recetas, pedidos,
      addInsumo, updateInsumo, deleteInsumo, registrarCompra,
      addReceta, updateReceta, deleteReceta,
      addPedido, updatePedido, updateEstadoPedido, deletePedido,
      calcularCostoReceta,
    }}>
      {children}
    </Store.Provider>
  )
}

export const useStore = () => useContext(Store)
