import { useState } from 'react'
import { useStore } from '../store'
import type { Pedido, ItemPedido, Decoracion, EstadoPedido } from '../types'

function Modal({ open, onClose, children, title, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-xl border border-border w-full overflow-y-auto" style={{ background: '#1a0e08', maxWidth: wide ? 700 : 480, maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 z-10" style={{ background: '#1a0e08' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#f0e6d3' }}>{title}</h2>
          <button onClick={onClose} style={{ color: '#7a6050', fontSize: 18 }} className="hover:text-cream transition-colors">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const inputCls = "w-full rounded-md border border-border bg-bg px-3 py-2 text-cream text-sm outline-none focus:border-gold transition-colors"

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente', en_proceso: 'En proceso', listo: 'Listo para entregar', entregado: 'Entregado', cancelado: 'Cancelado',
}
const estadoColor: Record<string, string> = {
  pendiente: '#c4952a', en_proceso: '#4a80c4', listo: '#4a9a5a', entregado: '#7a6050', cancelado: '#c44a4a',
}

function Badge({ estado }: { estado: string }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: estadoColor[estado] + '22', color: estadoColor[estado], border: `1px solid ${estadoColor[estado]}44` }}>
      {estadoLabel[estado]}
    </span>
  )
}

type NewOrderForm = {
  clienteNombre: string
  clienteTelefono: string
  clienteDireccion: string
  fechaEntrega: string
  notas: string
  descuento: string
}

const emptyNewOrder = (): NewOrderForm => ({
  clienteNombre: '', clienteTelefono: '', clienteDireccion: '',
  fechaEntrega: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
  notas: '', descuento: '0',
})

export default function Pedidos() {
  const { pedidos, recetas, addPedido, updateEstadoPedido, deletePedido } = useStore()
  const [tab, setTab] = useState<'nuevo' | 'activos' | 'historial'>('activos')

  // New order state
  const [form, setForm] = useState<NewOrderForm>(emptyNewOrder())
  const [items, setItems] = useState<ItemPedido[]>([])
  const [decos, setDecos] = useState<Decoracion[]>([])
  const [itemSel, setItemSel] = useState('')
  const [itemCant, setItemCant] = useState('1')
  const [decoNombre, setDecoNombre] = useState('')
  const [decoPrecio, setDecoPrecio] = useState('')

  // Detail modal
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailModal, setDetailModal] = useState(false)

  const activos = pedidos.filter(p => ['pendiente', 'en_proceso', 'listo'].includes(p.estado))
  const historial = pedidos.filter(p => ['entregado', 'cancelado'].includes(p.estado))

  function addItem() {
    if (!itemSel) return
    const receta = recetas.find(r => r.id === itemSel)
    if (!receta) return
    const cant = parseInt(itemCant) || 1
    setItems(prev => prev.some(i => i.recetaId === itemSel)
      ? prev.map(i => i.recetaId === itemSel ? { ...i, cantidad: i.cantidad + cant } : i)
      : [...prev, { recetaId: itemSel, cantidad: cant, precioUnitario: receta.precioVenta }])
    setItemSel('')
    setItemCant('1')
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.recetaId !== id))
  }

  function addDeco() {
    if (!decoNombre.trim()) return
    setDecos(prev => [...prev, { nombre: decoNombre.trim(), precio: parseFloat(decoPrecio) || 0 }])
    setDecoNombre('')
    setDecoPrecio('')
  }

  function removeDeco(i: number) {
    setDecos(prev => prev.filter((_, idx) => idx !== i))
  }

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
  const decoTotal = decos.reduce((s, d) => s + d.precio, 0)
  const descuento = parseFloat(form.descuento) || 0
  const total = subtotal + decoTotal - descuento

  async function submitPedido() {
    if (!form.clienteNombre.trim() || items.length === 0) return
    await addPedido({
      cliente: { nombre: form.clienteNombre.trim(), telefono: form.clienteTelefono.trim(), direccion: form.clienteDireccion.trim() },
      items,
      decoraciones: decos,
      descuento,
      precioFinal: total,
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString().split('T')[0],
      fechaEntrega: form.fechaEntrega,
      notas: form.notas.trim(),
    })
    setForm(emptyNewOrder())
    setItems([])
    setDecos([])
    setTab('activos')
  }

  const detail = detailId ? pedidos.find(p => p.id === detailId) : null

  function openDetail(id: string) {
    setDetailId(id)
    setDetailModal(true)
  }

  const tabs: { id: typeof tab; label: string; count?: number }[] = [
    { id: 'nuevo', label: 'Nuevo Pedido' },
    { id: 'activos', label: 'Activos', count: activos.length },
    { id: 'historial', label: 'Historial', count: historial.length },
  ]

  const siguienteEstado: Record<string, EstadoPedido> = {
    pendiente: 'en_proceso', en_proceso: 'listo', listo: 'entregado',
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#f0e6d3', fontWeight: 600 }}>Pedidos</h1>
        <p style={{ fontSize: 13, color: '#7a6050', marginTop: 4 }}>Gestión de pedidos y órdenes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border pb-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{
              color: tab === t.id ? '#c4882a' : '#7a6050',
              borderBottom: tab === t.id ? '2px solid #c4882a' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full text-xs" style={{
                background: tab === t.id ? 'rgba(196,136,42,0.2)' : '#2a1508',
                color: tab === t.id ? '#c4882a' : '#7a6050',
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Nuevo Pedido */}
      {tab === 'nuevo' && (
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 340px' }}>
          {/* Form */}
          <div className="space-y-6">
            {/* Customer */}
            <section className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
              <h3 style={{ fontSize: 13, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                Información del Cliente
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Nombre *</label>
                  <input className={inputCls} value={form.clienteNombre} onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))} placeholder="Nombre completo" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Teléfono</label>
                  <input className={inputCls} value={form.clienteTelefono} onChange={e => setForm(f => ({ ...f, clienteTelefono: e.target.value }))} placeholder="+54 9 11 ..." />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Dirección</label>
                  <input className={inputCls} value={form.clienteDireccion} onChange={e => setForm(f => ({ ...f, clienteDireccion: e.target.value }))} placeholder="Dirección de entrega" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Fecha de entrega *</label>
                  <input className={inputCls} type="date" value={form.fechaEntrega} onChange={e => setForm(f => ({ ...f, fechaEntrega: e.target.value }))} />
                </div>
              </div>
            </section>

            {/* Items */}
            <section className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
              <h3 style={{ fontSize: 13, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                Productos
              </h3>
              {items.length > 0 && (
                <div className="rounded-lg border border-border mb-4 overflow-hidden">
                  {items.map((item, i) => {
                    const receta = recetas.find(r => r.id === item.recetaId)
                    return (
                      <div key={item.recetaId} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < items.length - 1 ? '1px solid #2a1508' : 'none' }}>
                        <div className="flex-1">
                          <p style={{ fontSize: 13.5, color: '#c8b49a' }}>{receta?.nombre}</p>
                          <p style={{ fontSize: 11.5, color: '#7a6050' }}>
                            {item.cantidad} × ${item.precioUnitario.toFixed(2)}
                          </p>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#c4882a', fontSize: 14 }}>
                          ${(item.cantidad * item.precioUnitario).toFixed(2)}
                        </span>
                        <button onClick={() => removeItem(item.recetaId)} style={{ color: '#7a6050' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c44a4a' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <select value={itemSel} onChange={e => setItemSel(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-gold" style={{ minWidth: 0 }}>
                  <option value="">Seleccionar producto...</option>
                  {recetas.filter(r => r.activa).map(r => (
                    <option key={r.id} value={r.id}>{r.nombre} — ${r.precioVenta.toFixed(2)}</option>
                  ))}
                </select>
                <input type="number" min="1" value={itemCant} onChange={e => setItemCant(e.target.value)}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-gold"
                  style={{ width: 70 }} />
                <button onClick={addItem}
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{ background: 'rgba(196,136,42,0.15)', color: '#c4882a', border: '1px solid rgba(196,136,42,0.3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(196,136,42,0.25)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(196,136,42,0.15)' }}>
                  + Agregar
                </button>
              </div>
            </section>

            {/* Decoraciones */}
            <section className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
              <h3 style={{ fontSize: 13, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                Decoraciones y Extras
              </h3>
              {decos.length > 0 && (
                <div className="rounded-lg border border-border mb-4 overflow-hidden">
                  {decos.map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: i < decos.length - 1 ? '1px solid #2a1508' : 'none' }}>
                      <span style={{ fontSize: 13.5, color: '#c8b49a' }}>{d.nombre}</span>
                      <div className="flex items-center gap-3">
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#c4882a', fontSize: 13 }}>${d.precio.toFixed(2)}</span>
                        <button onClick={() => removeDeco(i)} style={{ color: '#7a6050' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c44a4a' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input value={decoNombre} onChange={e => setDecoNombre(e.target.value)} placeholder="Ej: Lazo de terciopelo..."
                  className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-gold" />
                <input type="number" step="0.01" value={decoPrecio} onChange={e => setDecoPrecio(e.target.value)} placeholder="$0"
                  className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-gold" style={{ width: 80 }} />
                <button onClick={addDeco}
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{ background: 'rgba(196,136,42,0.15)', color: '#c4882a', border: '1px solid rgba(196,136,42,0.3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(196,136,42,0.25)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(196,136,42,0.15)' }}>
                  + Agregar
                </button>
              </div>
            </section>

            {/* Notas */}
            <section className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
              <h3 style={{ fontSize: 13, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Notas</h3>
              <textarea className={inputCls} rows={3} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                placeholder="Instrucciones especiales, detalles del pedido..." style={{ resize: 'none' }} />
            </section>
          </div>

          {/* Summary sticky */}
          <div>
            <div className="sticky top-6 rounded-xl border border-border overflow-hidden" style={{ background: '#1c0d07' }}>
              <div className="px-5 py-4 border-b border-border">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3' }}>Resumen del pedido</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                {items.length === 0 && (
                  <p style={{ fontSize: 13, color: '#7a6050', textAlign: 'center', padding: '12px 0' }}>
                    Agrega productos al pedido
                  </p>
                )}
                {items.map(item => {
                  const receta = recetas.find(r => r.id === item.recetaId)
                  return (
                    <div key={item.recetaId} className="flex justify-between text-sm">
                      <span style={{ color: '#c8b49a' }}>{receta?.nombre} ×{item.cantidad}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#c8b49a' }}>${(item.cantidad * item.precioUnitario).toFixed(2)}</span>
                    </div>
                  )
                })}
                {decos.length > 0 && (
                  <>
                    <div className="border-t border-border pt-3">
                      {decos.map((d, i) => (
                        <div key={i} className="flex justify-between text-sm mb-1.5">
                          <span style={{ color: '#7a6050' }}>{d.nombre}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: '#7a6050' }}>${d.precio.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="px-5 pb-4 space-y-2 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#7a6050' }}>Subtotal</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#c8b49a' }}>${subtotal.toFixed(2)}</span>
                </div>
                {decoTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#7a6050' }}>Extras</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#c8b49a' }}>${decoTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: '#7a6050' }}>Descuento</span>
                  <div className="flex items-center gap-1">
                    <span style={{ color: '#7a6050' }}>$</span>
                    <input type="number" step="0.01" value={form.descuento} onChange={e => setForm(f => ({ ...f, descuento: e.target.value }))}
                      className="rounded border border-border bg-bg px-2 py-0.5 text-sm text-cream outline-none focus:border-gold text-right"
                      style={{ width: 70, fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span style={{ fontSize: 15, color: '#f0e6d3', fontWeight: 600 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: '#c4882a', fontWeight: 600 }}>${total.toFixed(2)}</span>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={submitPedido}
                  disabled={!form.clienteNombre.trim() || items.length === 0}
                  className="w-full rounded-lg py-3 text-sm font-medium transition-all"
                  style={{
                    background: form.clienteNombre.trim() && items.length > 0 ? '#c4882a' : '#3d2210',
                    color: form.clienteNombre.trim() && items.length > 0 ? '#0f0804' : '#7a6050',
                    cursor: form.clienteNombre.trim() && items.length > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  Crear Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activos */}
      {tab === 'activos' && (
        <div>
          {activos.length === 0 ? (
            <div className="py-16 text-center" style={{ color: '#7a6050' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>No hay pedidos activos</p>
              <button onClick={() => setTab('nuevo')} style={{ fontSize: 13, color: '#c4882a' }} className="hover:underline">
                Crear nuevo pedido
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activos.map(p => (
                <PedidoCard key={p.id} p={p} recetas={recetas} onDetail={() => openDetail(p.id)}
                  onAdvance={() => updateEstadoPedido(p.id, siguienteEstado[p.estado] as EstadoPedido)}
                  onCancel={() => updateEstadoPedido(p.id, 'cancelado')}
                  onDelete={() => deletePedido(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {tab === 'historial' && (
        <div>
          {historial.length === 0 ? (
            <div className="py-16 text-center" style={{ color: '#7a6050' }}>No hay pedidos en el historial</div>
          ) : (
            <div className="space-y-3">
              {[...historial].reverse().map(p => (
                <PedidoCard key={p.id} p={p} recetas={recetas} onDetail={() => openDetail(p.id)}
                  onDelete={() => deletePedido(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title="Detalle del Pedido" wide>
        {detail && (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#f0e6d3' }}>{detail.cliente.nombre}</h2>
                <p style={{ fontSize: 13, color: '#7a6050', marginTop: 2 }}>{detail.cliente.telefono}</p>
                {detail.cliente.direccion && <p style={{ fontSize: 13, color: '#7a6050' }}>{detail.cliente.direccion}</p>}
              </div>
              <Badge estado={detail.estado} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-lg border border-border p-3" style={{ background: '#130906' }}>
                <p style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha creación</p>
                <p style={{ fontSize: 13.5, color: '#c8b49a', marginTop: 3 }}>{new Date(detail.fechaCreacion).toLocaleDateString('es-AR')}</p>
              </div>
              <div className="rounded-lg border border-border p-3" style={{ background: '#130906' }}>
                <p style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha entrega</p>
                <p style={{ fontSize: 13.5, color: '#c8b49a', marginTop: 3 }}>{new Date(detail.fechaEntrega).toLocaleDateString('es-AR')}</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Productos</p>
            <div className="rounded-lg border border-border mb-4 overflow-hidden">
              {detail.items.map((item, i) => {
                const r = recetas.find(x => x.id === item.recetaId)
                return (
                  <div key={item.recetaId} className="flex justify-between items-center px-4 py-3" style={{ borderBottom: i < detail.items.length - 1 ? '1px solid #2a1508' : 'none' }}>
                    <span style={{ fontSize: 13.5, color: '#c8b49a' }}>{r?.nombre}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#7a6050', fontSize: 13 }}>
                      {item.cantidad} × ${item.precioUnitario.toFixed(2)}
                      <span style={{ color: '#c4882a', marginLeft: 12 }}>${(item.cantidad * item.precioUnitario).toFixed(2)}</span>
                    </span>
                  </div>
                )
              })}
            </div>
            {detail.decoraciones.length > 0 && (
              <>
                <p style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Extras</p>
                <div className="rounded-lg border border-border mb-4 overflow-hidden">
                  {detail.decoraciones.map((d, i) => (
                    <div key={i} className="flex justify-between px-4 py-2.5" style={{ borderBottom: i < detail.decoraciones.length - 1 ? '1px solid #2a1508' : 'none' }}>
                      <span style={{ fontSize: 13.5, color: '#c8b49a' }}>{d.nombre}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#c4882a', fontSize: 13 }}>${d.precio.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="rounded-lg border border-border p-4" style={{ background: '#130906' }}>
              {detail.descuento > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: '#7a6050' }}>Descuento</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#c44a4a' }}>−${detail.descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ fontSize: 15, color: '#f0e6d3', fontWeight: 600 }}>Total</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: '#c4882a', fontWeight: 600 }}>${detail.precioFinal.toFixed(2)}</span>
              </div>
            </div>
            {detail.notas && (
              <div className="mt-4 rounded-lg border border-border p-3" style={{ background: '#130906' }}>
                <p style={{ fontSize: 11, color: '#7a6050', marginBottom: 4 }}>Notas:</p>
                <p style={{ fontSize: 13, color: '#c8b49a' }}>{detail.notas}</p>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

function PedidoCard({ p, recetas, onDetail, onAdvance, onCancel, onDelete }: {
  p: Pedido
  recetas: ReturnType<typeof useStore>['recetas']
  onDetail: () => void
  onAdvance?: () => void
  onCancel?: () => void
  onDelete: () => void
}) {
  const siguiente: Record<string, string> = {
    pendiente: 'Iniciar proceso', en_proceso: 'Marcar listo', listo: 'Marcar entregado',
  }
  return (
    <div className="rounded-xl border border-border p-5 transition-all" style={{ background: '#1c0d07' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4f2e18' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3d2210' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 15, color: '#f0e6d3', fontWeight: 500 }}>{p.cliente.nombre}</span>
            <Badge estado={p.estado} />
          </div>
          <p style={{ fontSize: 12, color: '#7a6050' }}>
            {p.cliente.telefono}
            {p.cliente.direccion && ` · ${p.cliente.direccion}`}
          </p>
        </div>
        <div className="text-right">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: '#c4882a', fontWeight: 600 }}>
            ${p.precioFinal.toFixed(2)}
          </div>
          <p style={{ fontSize: 11.5, color: '#7a6050' }}>Entrega: {new Date(p.fechaEntrega).toLocaleDateString('es-AR')}</p>
        </div>
      </div>
      <div className="mb-4">
        <p style={{ fontSize: 12, color: '#7a6050' }}>
          {p.items.map(item => {
            const r = recetas.find(x => x.id === item.recetaId)
            return `${r?.nombre ?? '?'} ×${item.cantidad}`
          }).join(' · ')}
          {p.decoraciones.length > 0 && ` · ${p.decoraciones.length} extra${p.decoraciones.length > 1 ? 's' : ''}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onDetail}
          className="px-3 py-1.5 rounded-md text-xs border border-border transition-colors"
          style={{ color: '#c8b49a' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4f2e18'; (e.currentTarget as HTMLElement).style.color = '#f0e6d3' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3d2210'; (e.currentTarget as HTMLElement).style.color = '#c8b49a' }}>
          Ver detalle
        </button>
        {onAdvance && siguiente[p.estado] && (
          <button onClick={onAdvance}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{ background: 'rgba(74,154,90,0.15)', color: '#4a9a5a', border: '1px solid rgba(74,154,90,0.3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(74,154,90,0.25)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(74,154,90,0.15)' }}>
            {siguiente[p.estado]}
          </button>
        )}
        {onCancel && p.estado !== 'cancelado' && (
          <button onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-xs transition-colors ml-auto"
            style={{ color: '#7a6050' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c44a4a' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}>
            Cancelar
          </button>
        )}
        <button onClick={onDelete}
          className="p-1.5 rounded transition-colors"
          style={{ color: '#7a6050', marginLeft: onCancel ? 0 : 'auto' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c44a4a' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
