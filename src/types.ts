export type FormaPago = 'efectivo' | 'transferencia'

export interface Insumo {
  id: string
  nombre: string
  cantidad: number
  unidad: string
  costoPorUnidad: number
  vecesComprado: number
  costoTotal: number
  stockMinimo: number
}

export interface CompraInsumo {
  id: string
  insumoId: string | null
  insumoNombre: string
  cantidad: number
  unidad: string
  costoPorUnidad: number
  total: number
  formaPago: FormaPago
  fecha: string
  creadoEn: string
}

export interface IngredienteReceta {
  insumoId: string
  cantidad: number
}

export interface Receta {
  id: string
  nombre: string
  descripcion: string
  ingredientes: IngredienteReceta[]
  precioVenta: number
  vecesVendido: number
  activa: boolean
}

export interface ItemPedido {
  recetaId: string
  cantidad: number
  precioUnitario: number
}

export interface Decoracion {
  nombre: string
  precio: number
}

export interface Cliente {
  nombre: string
  telefono: string
  direccion: string
}

export type EstadoPedido = 'pendiente' | 'en_proceso' | 'listo' | 'entregado' | 'cancelado'

export type OrigenVenta = 'pedido' | 'mostrador'

export interface Venta {
  id: string
  pedidoId: string | null
  clienteNombre: string
  origen: OrigenVenta
  total: number
  efectivo: number
  transferencia: number
  fecha: string
  creadoEn: string
}

export type TipoMovimiento = 'ingreso' | 'gasto' | 'extraccion'

export interface CapitalInicial {
  efectivo: number
  transferencia: number
  fecha: string
  actualizadoEn: string
}

export interface MovimientoCaja {
  id: string
  tipo: TipoMovimiento
  concepto: string
  efectivo: number
  transferencia: number
  fecha: string
  creadoEn: string
}

export interface Pedido {
  id: string
  cliente: Cliente
  items: ItemPedido[]
  decoraciones: Decoracion[]
  descuento: number
  envio: number
  precioFinal: number
  estado: EstadoPedido
  fechaCreacion: string
  fechaEntrega: string
  notas: string
}
