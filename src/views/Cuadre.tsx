import { useEffect, useMemo, useState } from 'react'
import { aplicarConteo, calcularDia, totalPar, type ParCaja } from '../cuadre'
import { addDaysToISO, formatFecha, todayISO } from '../dates'
import { roundMoney } from '../economia'
import { useStore } from '../store'

const inputCls = 'w-full rounded-md border border-border bg-bg px-3 py-2 text-cream text-sm outline-none focus:border-gold transition-colors'

function money(n: number) {
  const abs = Math.abs(n)
  const txt = `$${abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (n < 0) return `−${txt}`
  return txt
}

function Pair({ e, t, invert }: { e: number; t: number; invert?: boolean }) {
  const ce = invert && e > 0 ? '#c44a4a' : e < 0 ? '#c44a4a' : '#4a9a5a'
  const ct = invert && t > 0 ? '#c44a4a' : t < 0 ? '#c44a4a' : '#4a80c4'
  return (
    <div className="grid grid-cols-3 gap-2 text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
      <span style={{ color: ce }}>{invert && e > 0 ? '−' : ''}{money(e)}</span>
      <span style={{ color: ct }}>{invert && t > 0 ? '−' : ''}{money(t)}</span>
      <span style={{ color: '#c4882a' }}>{invert ? money(-(e + t)) : money(e + t)}</span>
    </div>
  )
}

function Head3() {
  return (
    <div className="grid grid-cols-3 gap-2 mb-1" style={{ fontSize: 10.5, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      <span>Efectivo</span><span>Transferencia</span><span>Total</span>
    </div>
  )
}

function Block({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3', marginBottom: 12 }}>
        <span style={{ color: '#c4882a', marginRight: 8 }}>{n}.</span>{title}
      </h2>
      {children}
    </section>
  )
}

function Line({ label, par, invert }: { label: string; par: ParCaja; invert?: boolean }) {
  return (
    <div className="py-2" style={{ borderBottom: '1px solid #2a1508' }}>
      <p style={{ fontSize: 12.5, color: '#c8b49a', marginBottom: 4 }}>{label}</p>
      <Head3 />
      <Pair e={par.efectivo} t={par.transferencia} invert={invert} />
    </div>
  )
}

export default function Cuadre() {
  const { capital, ventas, pedidos, compras, movimientos, cuadres, cerrarCuadre, calcularCostoReceta } = useStore()
  const [fecha, setFecha] = useState(todayISO())
  const [realE, setRealE] = useState('')
  const [realT, setRealT] = useState('')
  const [ganCapE, setGanCapE] = useState('')
  const [ganCapT, setGanCapT] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const guardado = cuadres.find(c => c.fecha === fecha && c.cerrado)
  const previo = [...cuadres].filter(c => c.cerrado && c.fecha < fecha).sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null

  const base = useMemo(() => calcularDia({
    fecha,
    capital,
    previo: previo ? { cierre: previo.cierre, fecha: previo.fecha } : null,
    ventas,
    pedidos,
    compras,
    movimientos,
    costoPedido: p => p.items.reduce((s, i) => s + i.cantidad * calcularCostoReceta(i.recetaId), 0),
  }), [fecha, capital, previo, ventas, pedidos, compras, movimientos, calcularCostoReceta])

  useEffect(() => {
    setRealE('')
    setRealT('')
    setGanCapE(String(base.ganancia.efectivo))
    setGanCapT(String(base.ganancia.transferencia))
    setError(null)
  }, [fecha])

  const real = {
    efectivo: realE === '' ? base.esperado.efectivo : (parseFloat(realE) || 0),
    transferencia: realT === '' ? base.esperado.transferencia : (parseFloat(realT) || 0),
  }
  const aplicado = aplicarConteo(base, real, {
    efectivo: parseFloat(ganCapE) || 0,
    transferencia: parseFloat(ganCapT) || 0,
  })
  const view = guardado ?? { ...base, ...aplicado, id: '', cerrado: false, creadoEn: '', actualizadoEn: '' }

  async function cerrar() {
    setSaving(true)
    setError(null)
    try {
      await cerrarCuadre({
        fecha,
        realEfectivo: roundMoney(real.efectivo),
        realTransferencia: roundMoney(real.transferencia),
        gananciaCapitalEfectivo: roundMoney(parseFloat(ganCapE) || 0),
        gananciaCapitalTransferencia: roundMoney(parseFloat(ganCapT) || 0),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el cuadre')
    } finally {
      setSaving(false)
    }
  }

  const puedeCerrar = Boolean(capital || previo) && !guardado

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#f0e6d3', fontWeight: 600 }}>Cuadre</h1>
          <p style={{ fontSize: 13, color: '#7a6050', marginTop: 4 }}>Cierre diario de caja. Efectivo y transferencia por separado.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setFecha(addDaysToISO(fecha, -1))} className="rounded-md border border-border px-3 py-1.5" style={{ color: '#c8b49a' }}>‹</button>
          <input type="date" value={fecha} onChange={e => { if (e.target.value) setFecha(e.target.value) }} className={inputCls} style={{ width: 170 }} />
          <button type="button" onClick={() => setFecha(addDaysToISO(fecha, 1))} className="rounded-md border border-border px-3 py-1.5" style={{ color: '#c8b49a' }}>›</button>
        </div>
      </div>

      {!capital && !previo && (
        <div className="rounded-lg border border-border p-4 mb-6" style={{ background: '#1c0d07', color: '#c4952a' }}>
          Definí el capital inicial en Economía. El primer cuadre usa ese capital como apertura.
        </div>
      )}

      {guardado && (
        <div className="rounded-lg border p-3 mb-6 text-sm" style={{ borderColor: '#4a9a5a55', color: '#4a9a5a', background: '#4a9a5a12' }}>
          Día cerrado el {formatFecha(guardado.fecha)}. La apertura del próximo día será este cierre.
        </div>
      )}

      <div className="space-y-5">
        <Block n={1} title="Apertura">
          <p style={{ fontSize: 12.5, color: '#7a6050', marginBottom: 10 }}>
            {view.origenApertura === 'cierre_anterior' && previo
              ? `Cierre del ${formatFecha(previo.fecha)}.`
              : 'Primer cuadre: capital inicial.'}
          </p>
          <Head3 />
          <Pair e={view.apertura.efectivo} t={view.apertura.transferencia} />
        </Block>

        <Block n={2} title="Ingresos, costo y ganancia">
          <Line label="Ingresos por ventas" par={view.ingresos} />
          <Line label="Cubre costo de producción" par={view.costo} invert />
          <Line label="Ganancia de las ventas" par={view.ganancia} />
          {totalPar(view.otrosIngresos) !== 0 && <Line label="Otros ingresos (aportes)" par={view.otrosIngresos} />}
        </Block>

        <Block n={3} title="Gastos y extracciones">
          <Line label="Gastos del día (insumos y otros)" par={view.gastos} invert />
          <Line label="Extracciones" par={view.extracciones} invert />
        </Block>

        <Block n={4} title="Capital esperado y conteo real">
          <Line label="Capital esperado" par={view.esperado} />
          {!guardado && (
            <div className="grid grid-cols-2 gap-3 my-4">
              <div>
                <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Efectivo contado</label>
                <input className={inputCls} type="number" step="0.01" min="0" value={realE} placeholder={String(base.esperado.efectivo)}
                  onChange={e => setRealE(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Transferencia contada</label>
                <input className={inputCls} type="number" step="0.01" min="0" value={realT} placeholder={String(base.esperado.transferencia)}
                  onChange={e => setRealT(e.target.value)} />
              </div>
            </div>
          )}
          <Line label="Diferencia (real − esperado)" par={view.diferencia} />
          <p style={{ fontSize: 12, color: '#7a6050', marginTop: 8 }}>
            {totalPar(view.diferencia) === 0 ? 'Caja cuadrada.' : totalPar(view.diferencia) > 0 ? 'Hay un sobrante.' : 'Hay un faltante.'}
          </p>
        </Block>

        <Block n={5} title="Cierre">
          <Line label="Dinero sin contar la ganancia" par={view.sinGanancia} />
          <p style={{ fontSize: 12.5, color: '#7a6050', margin: '12px 0 8px' }}>
            De la ganancia, cuánto entra al capital del negocio:
          </p>
          {!guardado && (
            <>
              <div className="flex gap-2 mb-3">
                <button type="button" className="flex-1 rounded-md py-1.5 text-xs border border-border" style={{ color: '#4a9a5a' }}
                  onClick={() => { setGanCapE(String(base.ganancia.efectivo)); setGanCapT(String(base.ganancia.transferencia)) }}>
                  Toda la ganancia
                </button>
                <button type="button" className="flex-1 rounded-md py-1.5 text-xs border border-border" style={{ color: '#c4952a' }}
                  onClick={() => { setGanCapE('0'); setGanCapT('0') }}>
                  No ingresar ganancia
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Ganancia a capital · efectivo</label>
                  <input className={inputCls} type="number" step="0.01" min="0" value={ganCapE} onChange={e => setGanCapE(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', marginBottom: 5 }}>Ganancia a capital · transferencia</label>
                  <input className={inputCls} type="number" step="0.01" min="0" value={ganCapT} onChange={e => setGanCapT(e.target.value)} />
                </div>
              </div>
            </>
          )}
          <Line label="Cierre (apertura del próximo día)" par={view.cierre} />
          {error && <p className="mt-3 text-sm" style={{ color: '#c44a4a' }}>{error}</p>}
          {puedeCerrar && (
            <button type="button" disabled={saving} onClick={cerrar}
              className="w-full mt-4 rounded-lg py-3 text-sm font-medium"
              style={{ background: '#c4882a', color: '#0f0804' }}>
              {saving ? 'Cerrando...' : `Cerrar cuadre del ${formatFecha(fecha)}`}
            </button>
          )}
        </Block>
      </div>

      {cuadres.length > 0 && (
        <div className="mt-6 rounded-xl border border-border overflow-hidden" style={{ background: '#1c0d07' }}>
          <div className="px-5 py-4 border-b border-border">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3' }}>Cuadres anteriores</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #3d2210' }}>
                {['Fecha', 'Apertura', 'Ingresos', 'Ganancia', 'Cierre'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5" style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuadres.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < cuadres.length - 1 ? '1px solid #2a1508' : 'none', cursor: 'pointer' }}
                  onClick={() => setFecha(c.fecha)}>
                  <td className="px-4 py-2.5" style={{ color: '#c8b49a' }}>{formatFecha(c.fecha)}</td>
                  <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-mono)', color: '#7a6050' }}>{money(totalPar(c.apertura))}</td>
                  <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-mono)', color: '#4a9a5a' }}>{money(totalPar(c.ingresos))}</td>
                  <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-mono)', color: '#c4882a' }}>{money(totalPar(c.ganancia))}</td>
                  <td className="px-4 py-2.5" style={{ fontFamily: 'var(--font-mono)', color: '#f0e6d3', fontWeight: 600 }}>{money(totalPar(c.cierre))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
