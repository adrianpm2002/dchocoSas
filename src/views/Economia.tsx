import { useState } from 'react'
import { formatFecha, todayISO } from '../dates'
import { armarLibro, roundMoney, resumenCaja } from '../economia'
import { useStore } from '../store'
import type { TipoMovimiento } from '../types'

const inputCls = 'w-full rounded-md border border-border bg-bg px-3 py-2 text-cream text-sm outline-none focus:border-gold transition-colors'

function money(n: number) {
  const abs = Math.abs(n)
  const txt = `$${abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (n < 0) return `−${txt}`
  return txt
}

const tipoLabel: Record<string, string> = {
  capital: 'Capital',
  venta: 'Venta',
  compra: 'Compra',
  ingreso: 'Ingreso',
  gasto: 'Gasto',
  extraccion: 'Extracción',
}

const tipoColor: Record<string, string> = {
  capital: '#c4882a',
  venta: '#4a9a5a',
  compra: '#c44a4a',
  ingreso: '#4a9a5a',
  gasto: '#c44a4a',
  extraccion: '#c4952a',
}

export default function Economia() {
  const { capital, ventas, compras, movimientos, guardarCapital, addMovimiento, deleteMovimiento } = useStore()
  const resumen = resumenCaja(capital, ventas, compras, movimientos)
  const libro = armarLibro(capital, ventas, compras, movimientos)

  const [capEfectivo, setCapEfectivo] = useState(capital ? String(capital.efectivo) : '')
  const [capTransfer, setCapTransfer] = useState(capital ? String(capital.transferencia) : '')
  const [capFecha, setCapFecha] = useState(capital?.fecha ?? todayISO())
  const [capOpen, setCapOpen] = useState(!capital)
  const [capSaving, setCapSaving] = useState(false)
  const [capError, setCapError] = useState<string | null>(null)

  const [movTipo, setMovTipo] = useState<TipoMovimiento>('ingreso')
  const [movConcepto, setMovConcepto] = useState('')
  const [movFecha, setMovFecha] = useState(todayISO())
  const [movEfectivo, setMovEfectivo] = useState('')
  const [movTransfer, setMovTransfer] = useState('')
  const [movError, setMovError] = useState<string | null>(null)
  const [movSaving, setMovSaving] = useState(false)

  async function submitCapital() {
    setCapSaving(true)
    setCapError(null)
    try {
      await guardarCapital({
        efectivo: parseFloat(capEfectivo) || 0,
        transferencia: parseFloat(capTransfer) || 0,
        fecha: capFecha || todayISO(),
      })
      setCapOpen(false)
    } catch (err) {
      setCapError(err instanceof Error ? err.message : 'No se pudo guardar el capital')
    } finally {
      setCapSaving(false)
    }
  }

  async function submitMovimiento() {
    setMovSaving(true)
    setMovError(null)
    try {
      await addMovimiento({
        tipo: movTipo,
        concepto: movConcepto,
        efectivo: parseFloat(movEfectivo) || 0,
        transferencia: parseFloat(movTransfer) || 0,
        fecha: movFecha || todayISO(),
      })
      setMovConcepto('')
      setMovEfectivo('')
      setMovTransfer('')
      setMovFecha(todayISO())
    } catch (err) {
      setMovError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento')
    } finally {
      setMovSaving(false)
    }
  }

  const lineas = [
    { label: 'Capital inicial', e: resumen.capitalEfectivo, t: resumen.capitalTransferencia, sign: 1 },
    { label: 'Ventas cobradas', e: resumen.ventasEfectivo, t: resumen.ventasTransferencia, sign: 1 },
    { label: 'Compras de insumos', e: resumen.comprasEfectivo, t: resumen.comprasTransferencia, sign: -1 },
    { label: 'Otros ingresos', e: resumen.ingresosEfectivo, t: resumen.ingresosTransferencia, sign: 1 },
    { label: 'Otros gastos', e: resumen.gastosEfectivo, t: resumen.gastosTransferencia, sign: -1 },
    { label: 'Extracciones', e: resumen.extraccionesEfectivo, t: resumen.extraccionesTransferencia, sign: -1 },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#f0e6d3', fontWeight: 600 }}>Economía</h1>
        <p style={{ fontSize: 13, color: '#7a6050', marginTop: 4 }}>
          Caja en tiempo real: capital inicial, ventas, compras, ingresos y extracciones.
          {capital ? ` Desde ${formatFecha(capital.fecha)}.` : ''}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Efectivo', value: resumen.efectivo, color: '#4a9a5a' },
          { label: 'Transferencia', value: resumen.transferencia, color: '#4a80c4' },
          { label: 'Total en caja', value: resumen.total, color: '#c4882a' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border p-4" style={{ background: '#1c0d07' }}>
            <p style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, color: s.value < 0 ? '#c44a4a' : s.color, marginTop: 6 }}>
              {money(s.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#1c0d07' }}>
          <div className="px-5 py-4 border-b border-border">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3' }}>Cómo se arma el saldo</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #3d2210' }}>
                {['Concepto', 'Efectivo', 'Transferencia'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5" style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineas.map(l => (
                <tr key={l.label} style={{ borderBottom: '1px solid #2a1508' }}>
                  <td className="px-4 py-2.5" style={{ color: '#c8b49a' }}>{l.label}</td>
                  <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-mono)', color: l.sign < 0 && l.e > 0 ? '#c44a4a' : '#c8b49a' }}>
                    {l.sign < 0 && l.e > 0 ? '−' : ''}{money(l.e)}
                  </td>
                  <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-mono)', color: l.sign < 0 && l.t > 0 ? '#c44a4a' : '#c8b49a' }}>
                    {l.sign < 0 && l.t > 0 ? '−' : ''}{money(l.t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3' }}>Capital inicial</h2>
            {capital && !capOpen && (
              <button type="button" onClick={() => setCapOpen(true)} className="text-xs" style={{ color: '#c4882a' }}>Editar</button>
            )}
          </div>
          {!capOpen && capital ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span style={{ color: '#7a6050' }}>Efectivo</span><span style={{ fontFamily: 'var(--font-mono)', color: '#4a9a5a' }}>{money(capital.efectivo)}</span></div>
              <div className="flex justify-between"><span style={{ color: '#7a6050' }}>Transferencia</span><span style={{ fontFamily: 'var(--font-mono)', color: '#4a80c4' }}>{money(capital.transferencia)}</span></div>
              <div className="flex justify-between"><span style={{ color: '#7a6050' }}>Desde</span><span style={{ color: '#c8b49a' }}>{formatFecha(capital.fecha)}</span></div>
              <p style={{ fontSize: 11.5, color: '#7a6050', marginTop: 10 }}>
                Las ventas, compras y movimientos de esa fecha en adelante se suman o restan solas.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 12, color: '#7a6050', marginBottom: 12 }}>
                Poné el dinero que hay ahora. A partir de esa fecha, cada venta, compra, ingreso o extracción actualiza la caja.
              </p>
              <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Efectivo</label>
              <input className={`${inputCls} mb-3`} type="number" step="0.01" min="0" value={capEfectivo} onChange={e => setCapEfectivo(e.target.value)} placeholder="0.00" />
              <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Transferencia / banco</label>
              <input className={`${inputCls} mb-3`} type="number" step="0.01" min="0" value={capTransfer} onChange={e => setCapTransfer(e.target.value)} placeholder="0.00" />
              <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>A partir de</label>
              <input className={`${inputCls} mb-3`} type="date" value={capFecha} onChange={e => { if (e.target.value) setCapFecha(e.target.value) }} />
              {capError && <p className="mb-3 text-sm" style={{ color: '#c44a4a' }}>{capError}</p>}
              <div className="flex gap-2">
                {capital && (
                  <button type="button" onClick={() => setCapOpen(false)} className="flex-1 rounded-lg py-2 text-sm border border-border" style={{ color: '#7a6050' }}>Cancelar</button>
                )}
                <button type="button" disabled={capSaving} onClick={submitCapital} className="flex-1 rounded-lg py-2 text-sm font-medium"
                  style={{ background: '#c4882a', color: '#0f0804' }}>
                  {capSaving ? 'Guardando...' : 'Guardar capital'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '360px 1fr' }}>
        <div className="rounded-xl border border-border p-5 h-fit" style={{ background: '#1c0d07' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3', marginBottom: 14 }}>Nuevo movimiento</h2>
          <div className="flex rounded-lg border border-border overflow-hidden mb-4">
            {([
              { id: 'ingreso' as const, label: 'Ingreso' },
              { id: 'gasto' as const, label: 'Gasto' },
              { id: 'extraccion' as const, label: 'Extracción' },
            ]).map(op => (
              <button
                key={op.id}
                type="button"
                onClick={() => setMovTipo(op.id)}
                className="flex-1 py-1.5 text-xs font-medium"
                style={{
                  background: movTipo === op.id ? 'rgba(196,136,42,0.18)' : 'transparent',
                  color: movTipo === op.id ? '#c4882a' : '#7a6050',
                }}
              >
                {op.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: '#7a6050', marginBottom: 12 }}>
            {movTipo === 'ingreso' && 'Dinero que entra y no es una venta (aporte, préstamo, etc.).'}
            {movTipo === 'gasto' && 'Pago que no es compra de insumo (luz, envases, etc.). Las compras de insumos ya se restan solas.'}
            {movTipo === 'extraccion' && 'Dinero que sacás de la caja o del banco.'}
          </p>
          <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Concepto</label>
          <input className={`${inputCls} mb-3`} value={movConcepto} onChange={e => setMovConcepto(e.target.value)} placeholder="Ej: Pago de luz..." />
          <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Fecha</label>
          <input className={`${inputCls} mb-3`} type="date" value={movFecha} onChange={e => { if (e.target.value) setMovFecha(e.target.value) }} />
          <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Efectivo</label>
          <input className={`${inputCls} mb-3`} type="number" step="0.01" min="0" value={movEfectivo} onChange={e => setMovEfectivo(e.target.value)} placeholder="0.00" />
          <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Transferencia</label>
          <input className={`${inputCls} mb-4`} type="number" step="0.01" min="0" value={movTransfer} onChange={e => setMovTransfer(e.target.value)} placeholder="0.00" />
          {movError && <p className="mb-3 text-sm" style={{ color: '#c44a4a' }}>{movError}</p>}
          <button
            type="button"
            disabled={movSaving || !movConcepto.trim() || (roundMoney(parseFloat(movEfectivo) || 0) === 0 && roundMoney(parseFloat(movTransfer) || 0) === 0)}
            onClick={submitMovimiento}
            className="w-full rounded-lg py-2.5 text-sm font-medium"
            style={{ background: '#c4882a', color: '#0f0804' }}
          >
            {movSaving ? 'Guardando...' : 'Registrar'}
          </button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#1c0d07' }}>
          <div className="px-5 py-4 border-b border-border">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3' }}>Libro de caja</h2>
          </div>
          {libro.length === 0 ? (
            <div className="px-5 py-12 text-center" style={{ color: '#7a6050' }}>Todavía no hay movimientos</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #3d2210' }}>
                  {['Fecha', 'Tipo', 'Detalle', 'Efectivo', 'Transferencia', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5" style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {libro.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: idx < libro.length - 1 ? '1px solid #2a1508' : 'none' }}>
                    <td className="px-4 py-2.5" style={{ color: '#7a6050', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatFecha(item.fecha)}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ color: tipoColor[item.tipo], background: tipoColor[item.tipo] + '22' }}>
                        {tipoLabel[item.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: '#c8b49a' }}>{item.concepto}</td>
                    <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-mono)', color: item.efectivo < 0 ? '#c44a4a' : item.efectivo > 0 ? '#4a9a5a' : '#7a6050' }}>
                      {item.efectivo === 0 ? '—' : money(item.efectivo)}
                    </td>
                    <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-mono)', color: item.transferencia < 0 ? '#c44a4a' : item.transferencia > 0 ? '#4a80c4' : '#7a6050' }}>
                      {item.transferencia === 0 ? '—' : money(item.transferencia)}
                    </td>
                    <td className="px-4 py-2.5">
                      {movimientos.some(m => m.id === item.id) && (
                        <button type="button" onClick={() => { void deleteMovimiento(item.id) }} title="Eliminar" style={{ color: '#7a6050' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c44a4a' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}>
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
