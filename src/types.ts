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
