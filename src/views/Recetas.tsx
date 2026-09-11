import { useState } from 'react'
import { useStore } from '../store'
import type { Receta, IngredienteReceta } from '../types'

function Modal({ open, onClose, children, title, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-xl border border-border w-full overflow-y-auto" style={{ background: '#1a0e08', maxWidth: wide ? 640 : 480, maxHeight: '92vh' }}>
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

type RecetaForm = {
  nombre: string
  descripcion: string
  precioVenta: string
  activa: boolean
  ingredientes: IngredienteReceta[]
}

const emptyForm = (): RecetaForm => ({ nombre: '', descripcion: '', precioVenta: '', activa: true, ingredientes: [] })

export default function Recetas() {
  const { recetas, insumos, addReceta, updateReceta, deleteReceta, calcularCostoReceta } = useStore()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'form' | 'detail' | 'delete' | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<RecetaForm>(emptyForm())
  const [ingSelect, setIngSelect] = useState('')
  const [ingCant, setIngCant] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)

  const filtered = recetas.filter(r => r.nombre.toLowerCase().includes(search.toLowerCase()))

  function openAdd() {
    setEditId(null)
    setForm(emptyForm())
    setModal('form')
  }

  function openEdit(r: Receta) {
    setEditId(r.id)
    setForm({ nombre: r.nombre, descripcion: r.descripcion, precioVenta: String(r.precioVenta), activa: r.activa, ingredientes: [...r.ingredientes] })
    setModal('form')
  }

  function openDetail(r: Receta) {
    setDetailId(r.id)
    setModal('detail')
  }

  function addIngrediente() {
    if (!ingSelect || !ingCant) return
    const cant = parseFloat(ingCant)
    if (cant <= 0) return
    setForm(f => ({
      ...f,
      ingredientes: f.ingredientes.some(i => i.insumoId === ingSelect)
        ? f.ingredientes.map(i => i.insumoId === ingSelect ? { ...i, cantidad: cant } : i)
        : [...f.ingredientes, { insumoId: ingSelect, cantidad: cant }],
    }))
    setIngSelect('')
    setIngCant('')
  }

  function removeIngrediente(id: string) {
    setForm(f => ({ ...f, ingredientes: f.ingredientes.filter(i => i.insumoId !== id) }))
  }

  function calcFormCosto() {
    return form.ingredientes.reduce((t, ing) => {
      const insumo = insumos.find(i => i.id === ing.insumoId)
      return t + (insumo ? ing.cantidad * insumo.costoPorUnidad : 0)
    }, 0)
  }

  async function submitReceta() {
    if (!form.nombre.trim()) return
    const data = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precioVenta: parseFloat(form.precioVenta) || 0,
      activa: form.activa,
      ingredientes: form.ingredientes,
    }
    if (editId) await updateReceta(editId, data)
    else await addReceta(data)
    setModal(null)
  }

  const detailReceta = detailId ? recetas.find(r => r.id === detailId) : null

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#f0e6d3', fontWeight: 600 }}>Recetas</h1>
          <p style={{ fontSize: 13, color: '#7a6050', marginTop: 4 }}>Gestión de productos y cálculo de costos</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: '#c4882a', color: '#0f0804' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e8b84a' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#c4882a' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Receta
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total recetas', value: recetas.length.toString() },
          { label: 'Margen promedio', value: (() => {
            const valid = recetas.filter(r => r.precioVenta > 0)
            if (!valid.length) return '—'
            const avg = valid.reduce((s, r) => {
              const c = calcularCostoReceta(r.id)
              return s + (r.precioVenta > 0 ? ((r.precioVenta - c) / r.precioVenta) * 100 : 0)
            }, 0) / valid.length
            return `${avg.toFixed(1)}%`
          })() },
          { label: 'Total vendidos', value: recetas.reduce((s, r) => s + r.vecesVendido, 0).toString() + ' uds' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border p-4" style={{ background: '#1c0d07' }}>
            <p style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: '#c4882a', marginTop: 4 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-5 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7a6050' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar receta..."
          className="w-full rounded-lg border border-border pl-9 pr-4 py-2.5 text-sm text-cream outline-none focus:border-gold transition-colors"
          style={{ background: '#1c0d07' }} />
      </div>

      {/* Cards grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
        {filtered.map(r => {
          const costo = calcularCostoReceta(r.id)
          const margen = r.precioVenta > 0 ? ((r.precioVenta - costo) / r.precioVenta) * 100 : 0
          return (
            <div
              key={r.id}
              className="rounded-xl border border-border p-5 cursor-pointer transition-all duration-150"
              style={{ background: '#1c0d07' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4f2e18' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3d2210' }}
              onClick={() => openDetail(r)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3', fontWeight: 600, flex: 1, marginRight: 8 }}>
                  {r.nombre}
                </h3>
                {!r.activa && (
                  <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#7a605022', color: '#7a6050', border: '1px solid #7a605033' }}>
                    Inactiva
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12.5, color: '#7a6050', marginBottom: 14, lineHeight: 1.5 }}>{r.descripcion || 'Sin descripción'}</p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span style={{ fontSize: 12, color: '#7a6050' }}>Costo de producción</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#c8b49a' }}>
                    ${costo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 12, color: '#7a6050' }}>Precio de venta</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#c4882a', fontWeight: 600 }}>
                    ${r.precioVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 12, color: '#7a6050' }}>Margen</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: margen > 50 ? '#4a9a5a' : margen > 25 ? '#c4952a' : '#c44a4a' }}>
                    {margen.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Margin bar */}
              <div className="h-1 rounded-full mb-3" style={{ background: '#3d2210' }}>
                <div className="h-1 rounded-full transition-all" style={{
                  width: `${Math.min(margen, 100)}%`,
                  background: margen > 50 ? '#4a9a5a' : margen > 25 ? '#c4952a' : '#c44a4a',
                }} />
              </div>

              <div className="flex items-center justify-between">
                <span style={{ fontSize: 12, color: '#7a6050' }}>
                  {r.ingredientes.length} ingrediente{r.ingredientes.length !== 1 ? 's' : ''} · {r.vecesVendido} vendidos
                </span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={e => { e.stopPropagation(); openEdit(r) }}
                    className="p-1.5 rounded transition-colors" style={{ color: '#7a6050' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c4882a' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDetailId(r.id); setModal('delete') }}
                    className="p-1.5 rounded transition-colors" style={{ color: '#7a6050' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c44a4a' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center" style={{ color: '#7a6050' }}>No se encontraron recetas</div>
      )}

      {/* Form modal */}
      <Modal open={modal === 'form'} onClose={() => setModal(null)} title={editId ? 'Editar Receta' : 'Nueva Receta'} wide>
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: 12, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Nombre</label>
          <input className={inputCls} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del producto" />
        </div>
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: 12, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Descripción</label>
          <textarea className={inputCls} rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del producto..." style={{ resize: 'none' }} />
        </div>
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: 12, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Precio de Venta ($)</label>
          <input className={inputCls} type="number" step="0.01" value={form.precioVenta} onChange={e => setForm(f => ({ ...f, precioVenta: e.target.value }))} placeholder="0.00" />
        </div>

        {/* Ingredients */}
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: 12, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ingredientes</label>
          {form.ingredientes.length > 0 && (
            <div className="rounded-lg border border-border mb-3 overflow-hidden">
              {form.ingredientes.map((ing, i) => {
                const insumo = insumos.find(x => x.id === ing.insumoId)
                const subtotal = insumo ? ing.cantidad * insumo.costoPorUnidad : 0
                return (
                  <div key={ing.insumoId} className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: i < form.ingredientes.length - 1 ? '1px solid #2a1508' : 'none' }}>
                    <div className="flex-1">
                      <span style={{ fontSize: 13, color: '#c8b49a' }}>{insumo?.nombre ?? 'Insumo eliminado'}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a6050' }}>
                      {ing.cantidad} {insumo?.unidad}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#c4882a', minWidth: 60, textAlign: 'right' }}>
                      ${subtotal.toFixed(3)}
                    </span>
                    <button onClick={() => removeIngrediente(ing.insumoId)} style={{ color: '#7a6050' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c44a4a' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex gap-2">
            <select
              value={ingSelect}
              onChange={e => setIngSelect(e.target.value)}
              className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-gold"
              style={{ minWidth: 0 }}
            >
              <option value="">Seleccionar insumo...</option>
              {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
            </select>
            <input
              type="number"
              placeholder="Cant."
              value={ingCant}
              onChange={e => setIngCant(e.target.value)}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-cream outline-none focus:border-gold"
              style={{ width: 80 }}
            />
            <button
              onClick={addIngrediente}
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ background: 'rgba(196,136,42,0.15)', color: '#c4882a', border: '1px solid rgba(196,136,42,0.3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(196,136,42,0.25)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(196,136,42,0.15)' }}
            >
              Agregar
            </button>
          </div>
        </div>

        {/* Cost summary */}
        {form.ingredientes.length > 0 && (
          <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(196,136,42,0.06)', border: '1px solid rgba(196,136,42,0.15)' }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: '#7a6050' }}>Costo de producción:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#c8b49a' }}>${calcFormCosto().toFixed(3)}</span>
            </div>
            {form.precioVenta && (
              <div className="flex justify-between text-sm mt-1">
                <span style={{ color: '#7a6050' }}>Margen estimado:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#4a9a5a' }}>
                  {(((parseFloat(form.precioVenta) - calcFormCosto()) / parseFloat(form.precioVenta)) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <input type="checkbox" id="activa" checked={form.activa} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} className="accent-gold" />
          <label htmlFor="activa" style={{ fontSize: 13, color: '#c8b49a' }}>Receta activa</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => setModal(null)} className="flex-1 rounded-lg py-2.5 text-sm border border-border" style={{ color: '#7a6050' }}>Cancelar</button>
          <button onClick={submitReceta} className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors" style={{ background: '#c4882a', color: '#0f0804' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e8b84a' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#c4882a' }}>
            {editId ? 'Guardar cambios' : 'Crear receta'}
          </button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title="Detalle de Receta" wide>
        {detailReceta && (() => {
          const costo = calcularCostoReceta(detailReceta.id)
          const margen = detailReceta.precioVenta > 0 ? ((detailReceta.precioVenta - costo) / detailReceta.precioVenta) * 100 : 0
          return (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#e8b84a', fontWeight: 600, marginBottom: 8 }}>{detailReceta.nombre}</h2>
              <p style={{ fontSize: 13.5, color: '#7a6050', marginBottom: 20 }}>{detailReceta.descripcion}</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Costo', v: `$${costo.toFixed(3)}` },
                  { label: 'Precio venta', v: `$${detailReceta.precioVenta.toFixed(2)}` },
                  { label: 'Margen', v: `${margen.toFixed(1)}%` },
                ].map(s => (
                  <div key={s.label} className="rounded-lg border border-border p-3 text-center" style={{ background: '#130906' }}>
                    <p style={{ fontSize: 10.5, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#c4882a', marginTop: 4 }}>{s.v}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ingredientes</p>
              <div className="rounded-lg border border-border overflow-hidden mb-4">
                {detailReceta.ingredientes.map((ing, i) => {
                  const insumo = insumos.find(x => x.id === ing.insumoId)
                  return (
                    <div key={ing.insumoId} className="flex justify-between items-center px-4 py-2.5" style={{ borderBottom: i < detailReceta.ingredientes.length - 1 ? '1px solid #2a1508' : 'none' }}>
                      <span style={{ fontSize: 13.5, color: '#c8b49a' }}>{insumo?.nombre}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#7a6050' }}>
                        {ing.cantidad} {insumo?.unidad}
                        <span style={{ color: '#c4882a', marginLeft: 12 }}>
                          ${(insumo ? ing.cantidad * insumo.costoPorUnidad : 0).toFixed(3)}
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: 13, color: '#7a6050' }}>Vendido <span style={{ color: '#c4882a', fontFamily: 'var(--font-mono)' }}>{detailReceta.vecesVendido}</span> veces</p>
            </>
          )
        })()}
      </Modal>

      {/* Delete modal */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Eliminar Receta">
        <p style={{ color: '#c8b49a', fontSize: 14, marginBottom: 20 }}>
          {"¿Eliminar esta receta? Esta acción no se puede deshacer."}
        </p>
        <div className="flex gap-3">
          <button onClick={() => setModal(null)} className="flex-1 rounded-lg py-2.5 text-sm border border-border" style={{ color: '#7a6050' }}>Cancelar</button>
          <button onClick={async () => { if (detailId) await deleteReceta(detailId); setModal(null) }}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium" style={{ background: '#c44a4a', color: '#f0e6d3' }}>
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  )
}
