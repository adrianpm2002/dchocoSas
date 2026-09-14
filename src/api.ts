import type { Insumo, Pedido, Receta } from './types'

export type Bootstrap = {
  insumos: Insumo[]
  recetas: Receta[]
  pedidos: Pedido[]
}

export type AuthStatus = {
  setupRequired: boolean
  authenticated: boolean
  username: string | null
}

export class AuthError extends Error {
  constructor(message = 'No autorizado') {
    super(message)
    this.name = 'AuthError'
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (res.status === 401) {
    if (!url.startsWith('/api/auth/')) window.dispatchEvent(new Event('dc-auth-required'))
    throw new AuthError((body as { error?: string }).error || 'No autorizado')
  }
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || res.statusText)
  }
  return body as T
}

export const api = {
  authStatus: () => request<AuthStatus>('/api/auth/status'),
  setup: (username: string, password: string) =>
    request<{ username: string }>('/api/auth/setup', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request<{ username: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  bootstrap: () => request<Bootstrap>('/api/bootstrap'),
  listInsumos: () => request<Insumo[]>('/api/insumos'),
  createInsumo: (data: Omit<Insumo, 'id'>) => request<Insumo>('/api/insumos', { method: 'POST', body: JSON.stringify(data) }),
  updateInsumo: (id: string, data: Partial<Insumo>) => request<Insumo>(`/api/insumos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInsumo: (id: string) => request<void>(`/api/insumos/${id}`, { method: 'DELETE' }),
  registrarCompra: (id: string, cantidad: number, costoPorUnidad: number) =>
    request<Insumo>(`/api/insumos/${id}/compra`, { method: 'POST', body: JSON.stringify({ cantidad, costoPorUnidad }) }),
  createReceta: (data: Omit<Receta, 'id' | 'vecesVendido'>) => request<Receta>('/api/recetas', { method: 'POST', body: JSON.stringify(data) }),
  updateReceta: (id: string, data: Partial<Receta>) => request<Receta>(`/api/recetas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteReceta: (id: string) => request<void>(`/api/recetas/${id}`, { method: 'DELETE' }),
  createPedido: (data: Omit<Pedido, 'id'>) => request<Pedido>('/api/pedidos', { method: 'POST', body: JSON.stringify(data) }),
  updatePedido: (id: string, data: Partial<Pedido>) => request<Pedido>(`/api/pedidos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateEstadoPedido: (id: string, estado: Pedido['estado']) =>
    request<Pedido>(`/api/pedidos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
  deletePedido: (id: string) => request<void>(`/api/pedidos/${id}`, { method: 'DELETE' }),
}
