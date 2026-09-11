import { useState } from 'react'
import { useStore } from '../store'
import type { Insumo } from '../types'

function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-xl border border-border w-full max-w-md overflow-hidden" style={{ background: '#1a0e08', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#f0e6d3' }}>{title}</h2>
          <button onClick={onClose} style={{ color: '#7a6050', fontSize: 18, lineHeight: 1 }} className="hover:text-cream transition-colors">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label style={{ display: 'block', fontSize: 12, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full rounded-md border border-border bg-bg px-3 py-2 text-cream text-sm outline-none focus:border-gold transition-colors"

function fmt(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

const unidades = ['g', 'kg', 'ml', 'L', 'unidad', 'rollo', 'sobre', 'taza', 'cda', 'cdta']

type InsumoForm = { nombre: string; cantidad: string; unidad: string; costoPorUnidad: string; stockMinimo: string }
const emptyForm = (): InsumoForm => ({ nombre: '', cantidad: '', unidad: 'g', costoPorUnidad: '', stockMinimo: '' })

export default function Insumos() {
  const { insumos, addInsumo, updateInsumo, deleteInsumo, registrarCompra } = useStore()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | 'compra' | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<InsumoForm>(emptyForm())
  const [compraForm, setCompraForm] = useState({ cantidad: '', costo: '' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = insumos.filter(i => i.nombre.toLowerCase().includes(search.toLowerCase()))

  const totalInversion = insumos.reduce((s, i) => s + i.costoTotal, 0)

  function openAdd() {
    setForm(emptyForm())
    setModal('add')
  }

  function openEdit(i: Insumo) {
    setEditId(i.id)
    setForm({
      nombre: i.nombre,
      cantidad: String(i.cantidad),
      unidad: i.unidad,
      costoPorUnidad: String(i.costoPorUnidad),
      stockMinimo: String(i.stockMinimo),
    })
    setModal('edit')
  }

  function openCompra(i: Insumo) {
    setEditId(i.id)
    setCompraForm({ cantidad: '', costo: String(i.costoPorUnidad) })
    setModal('compra')
  }

  async function submitInsumo() {
    const data = {
      nombre: form.nombre.trim(),
      cantidad: parseFloat(form.cantidad) || 0,
      unidad: form.unidad,
      costoPorUnidad: parseFloat(form.costoPorUnidad) || 0,
      stockMinimo: parseFloat(form.stockMinimo) || 0,
      vecesComprado: modal === 'add' ? 1 : (insumos.find(i => i.id === editId)?.vecesComprado ?? 1),
      costoTotal: modal === 'add' ? (parseFloat(form.cantidad) || 0) * (parseFloat(form.costoPorUnidad) || 0) : (insumos.find(i => i.id === editId)?.costoTotal ?? 0),
    }
    if (!data.nombre) return
    if (modal === 'add') await addInsumo(data)
    else if (modal === 'edit' && editId) await updateInsumo(editId, data)
    setModal(null)
  }

  async function submitCompra() {
    if (!editId) return
    const cant = parseFloat(compraForm.cantidad) || 0
    const costo = parseFloat(compraForm.costo) || 0
    if (cant <= 0) return
    await registrarCompra(editId, cant, costo)
    setModal(null)
  }

  const editInsumo = editId ? insumos.find(i => i.id === editId) : null

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#f0e6d3', fontWeight: 600 }}>Insumos</h1>
          <p style={{ fontSize: 13, color: '#7a6050', marginTop: 4 }}>Inventario de materias primas e insumos</p>
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
          Agregar Insumo
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total insumos', value: insumos.length.toString(), sub: 'registrados' },
          { label: 'Inversión total', value: `$${totalInversion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, sub: 'acumulada' },
          { label: 'Stock bajo', value: insumos.filter(i => i.cantidad <= i.stockMinimo).length.toString(), sub: 'por reponer', alert: true },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border p-4" style={{ background: '#1c0d07' }}>
            <p style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: s.alert && parseInt(s.value) > 0 ? '#c44a4a' : '#c4882a', marginTop: 4 }}>{s.value}</p>
            <p style={{ fontSize: 11.5, color: '#7a6050' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7a6050' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar insumo..."
          className="w-full rounded-lg border border-border pl-9 pr-4 py-2.5 text-sm text-cream outline-none focus:border-gold transition-colors"
          style={{ background: '#1c0d07' }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#1c0d07' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #3d2210' }}>
              {['Insumo', 'Cantidad', 'Unidad', 'Costo / Unidad', 'Compras', 'Costo Total', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3" style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center" style={{ color: '#7a6050' }}>
                  No se encontraron insumos
                </td>
              </tr>
            ) : (
              filtered.map((insumo, idx) => {
                const low = insumo.cantidad <= insumo.stockMinimo
                return (
                  <tr
                    key={insumo.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #2a1508' : 'none' }}
                    className="transition-colors hover:bg-card-hover"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {low && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#c44a4a' }} title="Stock bajo" />
                        )}
                        <span style={{ color: '#f0e6d3', fontWeight: 500 }}>{insumo.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: low ? '#c44a4a' : '#c8b49a' }}>
                      {insumo.cantidad.toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#7a6050' }}>{insumo.unidad}</td>
                    <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: '#c4882a' }}>
                      {fmt(insumo.costoPorUnidad)}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: '#c8b49a' }}>
                      {insumo.vecesComprado}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: '#c4882a', fontWeight: 500 }}>
                      ${insumo.costoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openCompra(insumo)}
                          title="Registrar compra"
                          className="px-2 py-1 rounded text-xs transition-colors"
                          style={{ color: '#4a9a5a', border: '1px solid #4a9a5a44', background: 'transparent' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4a9a5a18' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          + Compra
                        </button>
                        <button
                          onClick={() => openEdit(insumo)}
                          title="Editar"
                          className="p-1.5 rounded transition-colors"
                          style={{ color: '#7a6050', background: 'transparent' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c4882a' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(insumo.id)}
                          title="Eliminar"
                          className="p-1.5 rounded transition-colors"
                          style={{ color: '#7a6050', background: 'transparent' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c44a4a' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'Nuevo Insumo' : 'Editar Insumo'}>
        <Field label="Nombre del insumo">
          <input className={inputCls} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Chocolate oscuro 70%" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad inicial">
            <input className={inputCls} type="number" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Unidad">
            <select className={inputCls} value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
              {unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Costo por unidad ($)">
            <input className={inputCls} type="number" step="0.001" value={form.costoPorUnidad} onChange={e => setForm(f => ({ ...f, costoPorUnidad: e.target.value }))} placeholder="0.00" />
          </Field>
          <Field label={`Stock mínimo (${form.unidad})`}>
            <input className={inputCls} type="number" value={form.stockMinimo} onChange={e => setForm(f => ({ ...f, stockMinimo: e.target.value }))} placeholder="0" />
          </Field>
        </div>
        {form.cantidad && form.costoPorUnidad && (
          <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(196,136,42,0.08)', border: '1px solid rgba(196,136,42,0.2)' }}>
            <span style={{ fontSize: 12, color: '#7a6050' }}>Costo total: </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#c4882a', fontSize: 14 }}>
              ${(parseFloat(form.cantidad) * parseFloat(form.costoPorUnidad)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={() => setModal(null)} className="flex-1 rounded-lg py-2.5 text-sm border border-border transition-colors" style={{ color: '#7a6050' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f0e6d3' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}>
            Cancelar
          </button>
          <button onClick={submitInsumo} className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors" style={{ background: '#c4882a', color: '#0f0804' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e8b84a' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#c4882a' }}>
            {modal === 'add' ? 'Agregar' : 'Guardar cambios'}
          </button>
        </div>
      </Modal>

      {/* Compra modal */}
      <Modal open={modal === 'compra'} onClose={() => setModal(null)} title="Registrar Compra">
        {editInsumo && (
          <>
            <p style={{ fontSize: 13, color: '#c8b49a', marginBottom: 16 }}>
              <span style={{ color: '#7a6050' }}>Insumo: </span>{editInsumo.nombre}
              <span style={{ color: '#7a6050', marginLeft: 12 }}>Stock actual: </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#c4882a' }}>{editInsumo.cantidad} {editInsumo.unidad}</span>
            </p>
            <Field label={`Cantidad comprada (${editInsumo.unidad})`}>
              <input className={inputCls} type="number" value={compraForm.cantidad} onChange={e => setCompraForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="0" autoFocus />
            </Field>
            <Field label="Costo por unidad ($)">
              <input className={inputCls} type="number" step="0.001" value={compraForm.costo} onChange={e => setCompraForm(f => ({ ...f, costo: e.target.value }))} />
            </Field>
            {compraForm.cantidad && compraForm.costo && (
              <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(74,154,90,0.08)', border: '1px solid rgba(74,154,90,0.2)' }}>
                <span style={{ fontSize: 12, color: '#7a6050' }}>Total de esta compra: </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#4a9a5a', fontSize: 14 }}>
                  ${(parseFloat(compraForm.cantidad) * parseFloat(compraForm.costo)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 rounded-lg py-2.5 text-sm border border-border" style={{ color: '#7a6050' }}>Cancelar</button>
              <button onClick={submitCompra} className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors" style={{ background: '#4a9a5a', color: '#f0e6d3' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}>
                Registrar compra
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Confirm delete */}
      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Eliminar Insumo">
        <p style={{ color: '#c8b49a', fontSize: 14, marginBottom: 20 }}>
          {"¿Estás seguro de eliminar este insumo? Esta acción no se puede deshacer."}
        </p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg py-2.5 text-sm border border-border" style={{ color: '#7a6050' }}>Cancelar</button>
          <button onClick={async () => { await deleteInsumo(confirmDelete!); setConfirmDelete(null) }} className="flex-1 rounded-lg py-2.5 text-sm font-medium" style={{ background: '#c44a4a', color: '#f0e6d3' }}>
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  )
}
