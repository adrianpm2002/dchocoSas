import { useState } from 'react'
import { formatFecha, todayISO } from '../dates'
import { useStore } from '../store'
import type { Decoracion, ItemPedido, Pedido } from '../types'

const inputCls = 'w-full rounded-md border border-border bg-bg px-3 py-2 text-cream text-sm outline-none focus:border-gold transition-colors'

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
      {estadoLabel[estado] ?? estado}
    </span>
  )
}

function roundMoney(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type NewSaleForm = {
  clienteNombre: string
  clienteTelefono: string
  clienteDireccion: string
  notas: string
  descuento: string
}

const emptySale = (): NewSaleForm => ({
  clienteNombre: '', clienteTelefono: '', clienteDireccion: '', notas: '', descuento: '0',
})

export default function Ventas() {
  const { pedidos, recetas, ventas, registrarVenta, calcularCostoReceta } = useStore()
  const [tab, setTab] = useState<'pedido' | 'mostrador' | 'historial'>('pedido')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cobrarMostrador, setCobrarMostrador] = useState(false)
  const [fecha, setFecha] = useState(todayISO())
  const [efectivo, setEfectivo] = useState('')
  const [transferencia, setTransferencia] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<NewSaleForm>(emptySale())
  const [items, setItems] = useState<ItemPedido[]>([])
  const [decos, setDecos] = useState<Decoracion[]>([])
  const [itemSel, setItemSel] = useState('')
  const [itemCant, setItemCant] = useState('1')
  const [decoNombre, setDecoNombre] = useState('')
  const [decoPrecio, setDecoPrecio] = useState('')
  const [incluyeEnvio, setIncluyeEnvio] = useState(false)
  const [envioPrecio, setEnvioPrecio] = useState('')

  const vendidos = new Set(ventas.map(v => v.pedidoId).filter(Boolean) as string[])
  const pendientes = pedidos.filter(p => p.estado !== 'entregado' && !vendidos.has(p.id))
  const filtrados = pendientes.filter(p => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return p.cliente.nombre.toLowerCase().includes(q) || p.cliente.telefono.includes(q)
  })
  const selected = selectedId ? pedidos.find(p => p.id === selectedId) : null

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
  const decoTotal = decos.reduce((s, d) => s + d.precio, 0)
  const descuento = parseFloat(form.descuento) || 0
  const envio = incluyeEnvio ? (parseFloat(envioPrecio) || 0) : 0
  const totalMostrador = roundMoney(subtotal + decoTotal + envio - descuento)
  const total = tab === 'pedido' ? roundMoney(selected?.precioFinal ?? 0) : totalMostrador
  const pagadoEfectivo = roundMoney(parseFloat(efectivo) || 0)
  const pagadoTransfer = roundMoney(parseFloat(transferencia) || 0)
  const restante = roundMoney(total - pagadoEfectivo - pagadoTransfer)
  const pagoOk = total > 0 && Math.abs(restante) < 0.015

  function resetPago() {
    setEfectivo('')
    setTransferencia('')
    setFecha(todayISO())
    setError(null)
  }

  function resetMostrador() {
    setForm(emptySale())
    setItems([])
    setDecos([])
    setIncluyeEnvio(false)
    setEnvioPrecio('')
    setCobrarMostrador(false)
    resetPago()
  }

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

  function addDeco() {
    if (!decoNombre.trim()) return
    setDecos(prev => [...prev, { nombre: decoNombre.trim(), precio: parseFloat(decoPrecio) || 0 }])
    setDecoNombre('')
    setDecoPrecio('')
  }

  async function cobrar(payload: { pedidoId?: string; pedido?: Omit<Pedido, 'id'> }) {
    if (!pagoOk) return
    setSaving(true)
    setError(null)
    try {
      await registrarVenta({
        fecha,
        efectivo: pagadoEfectivo,
        transferencia: pagadoTransfer,
        ...payload,
      })
      setSelectedId(null)
      resetMostrador()
      setTab('historial')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  async function submitPedidoExistente() {
    if (!selected) return
    await cobrar({ pedidoId: selected.id })
  }

  async function submitMostrador() {
    if (!form.clienteNombre.trim() || items.length === 0) return
    await cobrar({
      pedido: {
        cliente: {
          nombre: form.clienteNombre.trim(),
          telefono: form.clienteTelefono.trim(),
          direccion: form.clienteDireccion.trim(),
        },
        items,
        decoraciones: decos,
        descuento,
        envio,
        precioFinal: totalMostrador,
        estado: 'pendiente',
        fechaCreacion: todayISO(),
        fechaEntrega: todayISO(),
        notas: form.notas.trim(),
      },
    })
  }

  const tabs: { id: typeof tab; label: string; count?: number }[] = [
    { id: 'pedido', label: 'Pedido existente', count: pendientes.length },
    { id: 'mostrador', label: 'Venta de mostrador' },
    { id: 'historial', label: 'Ventas', count: ventas.length },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#f0e6d3', fontWeight: 600 }}>Ventas</h1>
        <p style={{ fontSize: 13, color: '#7a6050', marginTop: 4 }}>
          Cobrás acá. El pedido pasa a entregado. Se puede pagar en efectivo, transferencia o ambos.
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id)
              setError(null)
              if (t.id !== 'pedido') setSelectedId(null)
              if (t.id !== 'mostrador') setCobrarMostrador(false)
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
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

      {tab === 'pedido' && (
        <div className="grid gap-6" style={{ gridTemplateColumns: selected ? '1fr 360px' : '1fr' }}>
          <div>
            <div className="mb-4 relative">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-cream outline-none focus:border-gold"
                style={{ background: '#1c0d07' }}
              />
            </div>
            {filtrados.length === 0 ? (
              <div className="py-16 text-center" style={{ color: '#7a6050' }}>No hay pedidos pendientes de cobro</div>
            ) : (
              <div className="space-y-2">
                {filtrados.map(p => {
                  const active = selectedId === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedId(p.id); resetPago() }}
                      className="w-full text-left rounded-xl border p-4 transition-colors"
                      style={{
                        background: '#1c0d07',
                        borderColor: active ? '#c4882a' : '#3d2210',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span style={{ fontSize: 14, color: '#f0e6d3', fontWeight: 500 }}>{p.cliente.nombre}</span>
                            <Badge estado={p.estado} />
                          </div>
                          <p style={{ fontSize: 12, color: '#7a6050' }}>
                            Entrega {formatFecha(p.fechaEntrega)}
                            {p.cliente.telefono ? ` · ${p.cliente.telefono}` : ''}
                          </p>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#c4882a', fontWeight: 600 }}>{money(p.precioFinal)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {selected && (
            <PagoPanel
              titulo={`Cobrar a ${selected.cliente.nombre}`}
              total={total}
              fecha={fecha}
              setFecha={setFecha}
              efectivo={efectivo}
              setEfectivo={setEfectivo}
              transferencia={transferencia}
              setTransferencia={setTransferencia}
              restante={restante}
              pagoOk={pagoOk}
              error={error}
              saving={saving}
              onSubmit={submitPedidoExistente}
              detalle={
                <p style={{ fontSize: 12, color: '#7a6050', marginBottom: 12 }}>
                  {selected.items.map(item => {
                    const r = recetas.find(x => x.id === item.recetaId)
                    return `${r?.nombre ?? '?'} ×${item.cantidad}`
                  }).join(' · ')}
                </p>
              }
            />
          )}
        </div>
      )}

      {tab === 'mostrador' && !cobrarMostrador && (
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 340px' }}>
          <div className="space-y-6">
            <section className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
              <h3 style={{ fontSize: 13, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Cliente</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Nombre *</label>
                  <input className={inputCls} value={form.clienteNombre} onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))} placeholder="Cliente mostrador" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Teléfono</label>
                  <input className={inputCls} value={form.clienteTelefono} onChange={e => setForm(f => ({ ...f, clienteTelefono: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Dirección</label>
                  <input className={inputCls} value={form.clienteDireccion} onChange={e => setForm(f => ({ ...f, clienteDireccion: e.target.value }))} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
              <h3 style={{ fontSize: 13, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Productos</h3>
              {items.length > 0 && (
                <div className="rounded-lg border border-border mb-4 overflow-hidden">
                  {items.map((item, i) => {
                    const receta = recetas.find(r => r.id === item.recetaId)
                    return (
                      <div key={item.recetaId} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < items.length - 1 ? '1px solid #2a1508' : 'none' }}>
                        <div className="flex-1">
                          <p style={{ fontSize: 13.5, color: '#c8b49a' }}>{receta?.nombre}</p>
                          <p style={{ fontSize: 11.5, color: '#7a6050' }}>{item.cantidad} × ${item.precioUnitario.toFixed(2)}</p>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#c4882a' }}>{money(item.cantidad * item.precioUnitario)}</span>
                        <button type="button" onClick={() => setItems(prev => prev.filter(x => x.recetaId !== item.recetaId))} style={{ color: '#7a6050' }}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <select value={itemSel} onChange={e => setItemSel(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-gold">
                  <option value="">Seleccionar producto...</option>
                  {recetas.filter(r => r.activa).map(r => (
                    <option key={r.id} value={r.id}>{r.nombre} — ${r.precioVenta.toFixed(2)}</option>
                  ))}
                </select>
                <input type="number" min="1" value={itemCant} onChange={e => setItemCant(e.target.value)}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-gold" style={{ width: 70 }} />
                <button type="button" onClick={addItem} className="px-3 py-2 rounded-md text-sm font-medium"
                  style={{ background: 'rgba(196,136,42,0.15)', color: '#c4882a', border: '1px solid rgba(196,136,42,0.3)' }}>+ Agregar</button>
              </div>
            </section>

            <section className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
              <h3 style={{ fontSize: 13, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Extras</h3>
              {decos.map((d, i) => (
                <div key={i} className="flex justify-between mb-2" style={{ color: '#c8b49a', fontSize: 13 }}>
                  <span>{d.nombre}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{money(d.precio)} <button type="button" onClick={() => setDecos(prev => prev.filter((_, idx) => idx !== i))} style={{ color: '#7a6050' }}>✕</button></span>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={decoNombre} onChange={e => setDecoNombre(e.target.value)} placeholder="Extra..."
                  className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-gold" />
                <input type="number" step="0.01" value={decoPrecio} onChange={e => setDecoPrecio(e.target.value)} placeholder="$0"
                  className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-gold" style={{ width: 80 }} />
                <button type="button" onClick={addDeco} className="px-3 py-2 rounded-md text-sm" style={{ color: '#c4882a' }}>+ Agregar</button>
              </div>
              <label className="flex items-center gap-3 mt-4" style={{ fontSize: 13.5, color: '#c8b49a' }}>
                <input type="checkbox" checked={incluyeEnvio} className="accent-gold"
                  onChange={e => { setIncluyeEnvio(e.target.checked); if (!e.target.checked) setEnvioPrecio('') }} />
                Incluye envío
              </label>
              {incluyeEnvio && (
                <input className={`${inputCls} mt-2`} type="number" step="0.01" min="0" value={envioPrecio}
                  onChange={e => setEnvioPrecio(e.target.value)} placeholder="Precio del envío" />
              )}
              <textarea className={`${inputCls} mt-3`} rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                placeholder="Notas" style={{ resize: 'none' }} />
            </section>
          </div>

          <div className="sticky top-6 rounded-xl border border-border overflow-hidden h-fit" style={{ background: '#1c0d07' }}>
            <div className="px-5 py-4 border-b border-border">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3' }}>Resumen</h3>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm">
              {items.map(item => (
                <div key={item.recetaId} className="flex justify-between">
                  <span style={{ color: '#c8b49a' }}>{recetas.find(r => r.id === item.recetaId)?.nombre} ×{item.cantidad}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#c8b49a' }}>{money(item.cantidad * item.precioUnitario)}</span>
                </div>
              ))}
              {decoTotal > 0 && <div className="flex justify-between" style={{ color: '#7a6050' }}><span>Extras</span><span style={{ fontFamily: 'var(--font-mono)' }}>{money(decoTotal)}</span></div>}
              {envio > 0 && <div className="flex justify-between" style={{ color: '#7a6050' }}><span>Envío</span><span style={{ fontFamily: 'var(--font-mono)' }}>{money(envio)}</span></div>}
              <div className="flex items-center justify-between" style={{ color: '#7a6050' }}>
                <span>Descuento</span>
                <input type="number" step="0.01" value={form.descuento} onChange={e => setForm(f => ({ ...f, descuento: e.target.value }))}
                  className="rounded border border-border bg-bg px-2 py-0.5 text-sm text-cream text-right outline-none" style={{ width: 70, fontFamily: 'var(--font-mono)' }} />
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span style={{ color: '#f0e6d3', fontWeight: 600 }}>Total</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: '#c4882a', fontWeight: 600 }}>{money(totalMostrador)}</span>
              </div>
              {items.length > 0 && (
                <div className="flex justify-between" style={{ color: '#7a6050' }}>
                  <span>Ganancia est.</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#4a9a5a' }}>
                    {money(totalMostrador - items.reduce((s, i) => s + i.cantidad * calcularCostoReceta(i.recetaId), 0))}
                  </span>
                </div>
              )}
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                disabled={!form.clienteNombre.trim() || items.length === 0}
                onClick={() => { resetPago(); setCobrarMostrador(true) }}
                className="w-full rounded-lg py-3 text-sm font-medium"
                style={{
                  background: form.clienteNombre.trim() && items.length > 0 ? '#c4882a' : '#3d2210',
                  color: form.clienteNombre.trim() && items.length > 0 ? '#0f0804' : '#7a6050',
                  cursor: form.clienteNombre.trim() && items.length > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                Continuar al cobro
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'mostrador' && cobrarMostrador && (
        <div className="max-w-md">
          <button type="button" onClick={() => setCobrarMostrador(false)} className="mb-4 text-sm" style={{ color: '#c4882a' }}>
            ← Volver a armar la venta
          </button>
          <PagoPanel
            titulo={`Cobrar a ${form.clienteNombre.trim() || 'cliente'}`}
            total={totalMostrador}
            fecha={fecha}
            setFecha={setFecha}
            efectivo={efectivo}
            setEfectivo={setEfectivo}
            transferencia={transferencia}
            setTransferencia={setTransferencia}
            restante={restante}
            pagoOk={pagoOk}
            error={error}
            saving={saving}
            onSubmit={submitMostrador}
          />
        </div>
      )}

      {tab === 'historial' && (
        ventas.length === 0 ? (
          <div className="py-16 text-center" style={{ color: '#7a6050' }}>Todavía no hay ventas cobradas</div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#1c0d07' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #3d2210' }}>
                  {['Fecha', 'Cliente', 'Origen', 'Efectivo', 'Transferencia', 'Total'].map(h => (
                    <th key={h} className="text-left px-4 py-3" style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventas.map((v, idx) => (
                  <tr key={v.id} style={{ borderBottom: idx < ventas.length - 1 ? '1px solid #2a1508' : 'none' }}>
                    <td className="px-4 py-3" style={{ color: '#7a6050', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatFecha(v.fecha)}</td>
                    <td className="px-4 py-3" style={{ color: '#f0e6d3', fontWeight: 500 }}>{v.clienteNombre}</td>
                    <td className="px-4 py-3" style={{ color: '#7a6050' }}>{v.origen === 'mostrador' ? 'Mostrador' : 'Pedido'}</td>
                    <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: v.efectivo > 0 ? '#4a9a5a' : '#7a6050' }}>{money(v.efectivo)}</td>
                    <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: v.transferencia > 0 ? '#4a80c4' : '#7a6050' }}>{money(v.transferencia)}</td>
                    <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: '#c4882a', fontWeight: 600 }}>{money(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

function PagoPanel({
  titulo, total, fecha, setFecha, efectivo, setEfectivo, transferencia, setTransferencia,
  restante, pagoOk, error, saving, onSubmit, detalle,
}: {
  titulo: string
  total: number
  fecha: string
  setFecha: (v: string) => void
  efectivo: string
  setEfectivo: (v: string) => void
  transferencia: string
  setTransferencia: (v: string) => void
  restante: number
  pagoOk: boolean
  error: string | null
  saving: boolean
  onSubmit: () => void
  detalle?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden h-fit sticky top-6" style={{ background: '#1c0d07' }}>
      <div className="px-5 py-4 border-b border-border">
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3' }}>{titulo}</h3>
      </div>
      <div className="px-5 py-4">
        {detalle}
        <div className="flex justify-between mb-4">
          <span style={{ color: '#7a6050' }}>Total a cobrar</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: '#c4882a', fontWeight: 600 }}>{money(total)}</span>
        </div>
        <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Fecha de la venta</label>
        <input className={`${inputCls} mb-4`} type="date" value={fecha} onChange={e => { if (e.target.value) setFecha(e.target.value) }} />
        <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Efectivo</label>
        <input className={`${inputCls} mb-3`} type="number" step="0.01" min="0" value={efectivo} onChange={e => setEfectivo(e.target.value)} placeholder="0.00" />
        <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Transferencia</label>
        <input className={`${inputCls} mb-3`} type="number" step="0.01" min="0" value={transferencia} onChange={e => setTransferencia(e.target.value)} placeholder="0.00" />
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => { setEfectivo(String(total)); setTransferencia('0') }}
            className="flex-1 rounded-md py-1.5 text-xs border border-border" style={{ color: '#4a9a5a' }}>Todo efectivo</button>
          <button type="button" onClick={() => { setTransferencia(String(total)); setEfectivo('0') }}
            className="flex-1 rounded-md py-1.5 text-xs border border-border" style={{ color: '#4a80c4' }}>Todo transferencia</button>
        </div>
        <div className="flex justify-between text-sm mb-4">
          <span style={{ color: '#7a6050' }}>{restante > 0.01 ? 'Falta' : restante < -0.01 ? 'Sobra' : 'Completo'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: pagoOk ? '#4a9a5a' : '#c44a4a' }}>
            {money(Math.abs(restante))}
          </span>
        </div>
        {error && <p className="mb-3 text-sm" style={{ color: '#c44a4a' }}>{error}</p>}
        <button
          type="button"
          disabled={!pagoOk || saving}
          onClick={onSubmit}
          className="w-full rounded-lg py-3 text-sm font-medium"
          style={{
            background: pagoOk && !saving ? '#4a9a5a' : '#3d2210',
            color: pagoOk && !saving ? '#f0e6d3' : '#7a6050',
            cursor: pagoOk && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Registrando...' : 'Registrar venta'}
        </button>
      </div>
    </div>
  )
}
