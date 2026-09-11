import { useState } from 'react'
import { useStore } from '../store'

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function fmt(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

export default function Historial() {
  const { pedidos, recetas, insumos, calcularCostoReceta } = useStore()

  const today = new Date()
  const [mes, setMes] = useState(today.getMonth())
  const [año, setAño] = useState(today.getFullYear())

  const entregados = pedidos.filter(p => p.estado === 'entregado')
  const cancelados = pedidos.filter(p => p.estado === 'cancelado')

  const filtrados = entregados.filter(p => {
    const d = new Date(p.fechaCreacion)
    return d.getMonth() === mes && d.getFullYear() === año
  })

  const ingreso = filtrados.reduce((s, p) => s + p.precioFinal, 0)
  const costo = filtrados.reduce((s, p) => {
    return s + p.items.reduce((si, item) => si + item.cantidad * calcularCostoReceta(item.recetaId), 0)
  }, 0)
  const ganancia = ingreso - costo
  const margen = ingreso > 0 ? (ganancia / ingreso) * 100 : 0

  // All-time stats
  const ingresoTotal = entregados.reduce((s, p) => s + p.precioFinal, 0)
  const costoTotal = entregados.reduce((s, p) => s + p.items.reduce((si, item) => si + item.cantidad * calcularCostoReceta(item.recetaId), 0), 0)
  const gananciaTotal = ingresoTotal - costoTotal

  // Top recetas
  const recetaVentas: Record<string, number> = {}
  const recetaIngresos: Record<string, number> = {}
  entregados.forEach(p => {
    p.items.forEach(item => {
      recetaVentas[item.recetaId] = (recetaVentas[item.recetaId] || 0) + item.cantidad
      recetaIngresos[item.recetaId] = (recetaIngresos[item.recetaId] || 0) + item.cantidad * item.precioUnitario
    })
  })
  const topRecetas = Object.entries(recetaVentas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, ventas]) => ({
      id, ventas,
      nombre: recetas.find(r => r.id === id)?.nombre ?? 'Desconocido',
      ingreso: recetaIngresos[id] || 0,
    }))

  const maxVentas = topRecetas.length > 0 ? topRecetas[0].ventas : 1

  // Monthly data for mini chart (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
    const m = d.getMonth(), y = d.getFullYear()
    const orders = entregados.filter(p => {
      const od = new Date(p.fechaCreacion)
      return od.getMonth() === m && od.getFullYear() === y
    })
    return {
      label: meses[m].slice(0, 3),
      ingreso: orders.reduce((s, p) => s + p.precioFinal, 0),
      costo: orders.reduce((s, p) => s + p.items.reduce((si, item) => si + item.cantidad * calcularCostoReceta(item.recetaId), 0), 0),
      count: orders.length,
    }
  })
  const maxIngreso = Math.max(...monthlyData.map(m => m.ingreso), 1)

  const años = Array.from(new Set(entregados.map(p => new Date(p.fechaCreacion).getFullYear()))).sort((a, b) => b - a)
  if (!años.includes(today.getFullYear())) años.unshift(today.getFullYear())

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#f0e6d3', fontWeight: 600 }}>Historial</h1>
          <p style={{ fontSize: 13, color: '#7a6050', marginTop: 4 }}>Análisis de ventas y resultados</p>
        </div>
      </div>

      {/* All-time totals */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Ingresos totales', value: fmt(ingresoTotal), color: '#4a9a5a' },
          { label: 'Costo total', value: fmt(costoTotal), color: '#c44a4a' },
          { label: 'Ganancia neta', value: fmt(gananciaTotal), color: '#c4882a' },
          { label: 'Pedidos entregados', value: entregados.length.toString(), color: '#4a80c4' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border p-4" style={{ background: '#1c0d07' }}>
            <p style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Monthly chart */}
        <div className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3', marginBottom: 20 }}>Ingresos últimos 6 meses</h3>
          <div className="flex items-end gap-3 h-32">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a6050' }}>
                  {m.ingreso > 0 ? `$${(m.ingreso / 1000).toFixed(1)}k` : '—'}
                </span>
                <div className="w-full flex flex-col justify-end rounded-t-sm overflow-hidden" style={{ height: 100 }}>
                  <div
                    className="w-full rounded-t-sm transition-all duration-500"
                    style={{
                      height: `${Math.max((m.ingreso / maxIngreso) * 100, m.ingreso > 0 ? 4 : 0)}%`,
                      background: m.ingreso > 0 ? 'linear-gradient(180deg, #e8b84a, #c4882a)' : '#2a1508',
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: '#7a6050' }}>{m.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a6050' }}>{m.count}p</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top recetas */}
        <div className="rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3', marginBottom: 16 }}>Top productos</h3>
          {topRecetas.length === 0 ? (
            <p style={{ fontSize: 13, color: '#7a6050' }}>Sin datos aún</p>
          ) : (
            <div className="space-y-4">
              {topRecetas.map((r, i) => (
                <div key={r.id}>
                  <div className="flex justify-between mb-1.5">
                    <span style={{ fontSize: 13, color: '#c8b49a' }}>
                      <span style={{ color: '#7a6050', fontFamily: 'var(--font-mono)', fontSize: 11, marginRight: 6 }}>{i + 1}.</span>
                      {r.nombre}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#c4882a' }}>{r.ventas} uds</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: '#3d2210' }}>
                    <div className="h-1 rounded-full" style={{ width: `${(r.ventas / maxVentas) * 100}%`, background: 'linear-gradient(90deg, #c4882a, #e8b84a)' }} />
                  </div>
                  <p style={{ fontSize: 11, color: '#7a6050', marginTop: 2, textAlign: 'right' }}>{fmt(r.ingreso)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly filter */}
      <div className="flex items-center gap-3 mb-4">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#f0e6d3', flex: 1 }}>
          Pedidos de {meses[mes]} {año}
        </h2>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-cream outline-none focus:border-gold">
          {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={año} onChange={e => setAño(parseInt(e.target.value))}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-cream outline-none focus:border-gold">
          {años.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Pedidos', value: filtrados.length.toString(), color: '#4a80c4' },
          { label: 'Ingresos', value: fmt(ingreso), color: '#4a9a5a' },
          { label: 'Costos', value: fmt(costo), color: '#c44a4a' },
          { label: 'Ganancia', value: fmt(ganancia), sub: `Margen ${margen.toFixed(1)}%`, color: '#c4882a' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border p-3" style={{ background: '#1c0d07' }}>
            <p style={{ fontSize: 10.5, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: s.color, marginTop: 4 }}>{s.value}</p>
            {s.sub && <p style={{ fontSize: 11, color: '#7a6050', marginTop: 2 }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Orders table */}
      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-border py-12 text-center" style={{ background: '#1c0d07', color: '#7a6050' }}>
          No hay pedidos entregados en este período
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#1c0d07' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #3d2210' }}>
                {['Fecha', 'Cliente', 'Productos', 'Costo', 'Total', 'Ganancia'].map(h => (
                  <th key={h} className="text-left px-4 py-3" style={{ fontSize: 11, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filtrados].reverse().map((p, idx) => {
                const c = p.items.reduce((s, item) => s + item.cantidad * calcularCostoReceta(item.recetaId), 0)
                const g = p.precioFinal - c
                return (
                  <tr key={p.id} className="transition-colors hover:bg-card-hover"
                    style={{ borderBottom: idx < filtrados.length - 1 ? '1px solid #2a1508' : 'none' }}>
                    <td className="px-4 py-3" style={{ color: '#7a6050', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {new Date(p.fechaCreacion).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#f0e6d3' }}>{p.cliente.nombre}</td>
                    <td className="px-4 py-3" style={{ color: '#7a6050', fontSize: 12 }}>
                      {p.items.map(item => {
                        const r = recetas.find(x => x.id === item.recetaId)
                        return `${r?.nombre?.split(' ')[0] ?? '?'} ×${item.cantidad}`
                      }).join(', ')}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: '#c44a4a', fontSize: 13 }}>
                      {fmt(c)}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: '#c4882a', fontSize: 13, fontWeight: 600 }}>
                      {fmt(p.precioFinal)}
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: g >= 0 ? '#4a9a5a' : '#c44a4a' }}>
                        {g >= 0 ? '+' : ''}{fmt(g)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid #3d2210', background: '#130906' }}>
                <td colSpan={3} className="px-4 py-3" style={{ fontSize: 12, color: '#7a6050' }}>
                  {filtrados.length} pedidos en total
                </td>
                <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: '#c44a4a', fontWeight: 600 }}>
                  {fmt(costo)}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: '#c4882a', fontWeight: 600 }}>
                  {fmt(ingreso)}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: '#4a9a5a', fontWeight: 600 }}>
                  +{fmt(ganancia)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Inversion en insumos */}
      <div className="mt-6 rounded-xl border border-border p-5" style={{ background: '#1c0d07' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f0e6d3', marginBottom: 14 }}>Inversión en Insumos</h3>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {insumos.map(i => (
            <div key={i.id} className="rounded-lg border border-border p-3" style={{ background: '#130906' }}>
              <p style={{ fontSize: 12.5, color: '#c8b49a', marginBottom: 2 }}>{i.nombre}</p>
              <div className="flex justify-between">
                <span style={{ fontSize: 11, color: '#7a6050' }}>{i.vecesComprado} compras</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#c4882a' }}>{fmt(i.costoTotal)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex justify-between">
          <span style={{ fontSize: 14, color: '#c8b49a', fontWeight: 500 }}>Total invertido en insumos</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: '#c4882a', fontWeight: 600 }}>
            {fmt(insumos.reduce((s, i) => s + i.costoTotal, 0))}
          </span>
        </div>
      </div>
    </div>
  )
}
