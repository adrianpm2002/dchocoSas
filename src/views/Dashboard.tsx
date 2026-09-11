import { useStore } from '../store'
import type { View } from '../App'

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente', en_proceso: 'En proceso', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
}
const estadoColor: Record<string, string> = {
  pendiente: '#c4952a', en_proceso: '#4a80c4', listo: '#4a9a5a', entregado: '#7a6050', cancelado: '#c44a4a',
}

function fmt(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
}

function Badge({ estado }: { estado: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: estadoColor[estado] + '22', color: estadoColor[estado], border: `1px solid ${estadoColor[estado]}44` }}
    >
      {estadoLabel[estado]}
    </span>
  )
}

export default function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { pedidos, recetas, insumos, calcularCostoReceta } = useStore()

  const activos = pedidos.filter(p => ['pendiente', 'en_proceso', 'listo'].includes(p.estado))
  const entregados = pedidos.filter(p => p.estado === 'entregado')

  const ingresoTotal = entregados.reduce((s, p) => s + p.precioFinal, 0)
  const costoTotal = entregados.reduce((s, p) => {
    return s + p.items.reduce((si, item) => si + item.cantidad * calcularCostoReceta(item.recetaId), 0)
  }, 0)
  const ganancia = ingresoTotal - costoTotal

  const recetaTop = [...recetas].sort((a, b) => b.vecesVendido - a.vecesVendido)[0]

  const bajoStock = insumos.filter(i => i.cantidad <= i.stockMinimo)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#f0e6d3', fontWeight: 600 }}>
          {"D'ChocolAte"}
        </div>
        <p style={{ color: '#7a6050', fontSize: 14, marginTop: 4 }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Pedidos activos', value: activos.length.toString(), sub: 'requieren atención', color: '#c4952a', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
          { label: 'Ingresos totales', value: fmt(ingresoTotal), sub: `${entregados.length} pedidos entregados`, color: '#4a9a5a', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Ganancia neta', value: fmt(ganancia), sub: `Margen: ${ingresoTotal > 0 ? ((ganancia / ingresoTotal) * 100).toFixed(1) : 0}%`, color: '#c4882a', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
          { label: 'Stock bajo', value: bajoStock.length.toString(), sub: bajoStock.length > 0 ? 'insumos por reponer' : 'todo en orden', color: bajoStock.length > 0 ? '#c44a4a' : '#4a9a5a', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border p-5" style={{ background: '#1c0d07' }}>
            <div className="flex items-start justify-between mb-3">
              <p style={{ fontSize: 12, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
              <div className="rounded p-1.5" style={{ background: s.color + '18' }}>
                <svg className="w-4 h-4" style={{ color: s.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: s.color, fontWeight: 500, lineHeight: 1 }}>{s.value}</div>
            <p style={{ fontSize: 11.5, color: '#7a6050', marginTop: 6 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Pedidos activos */}
        <div className="rounded-lg border border-border" style={{ background: '#1c0d07' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: '#f0e6d3' }}>Pedidos Activos</h2>
            <button
              onClick={() => onNavigate('pedidos')}
              style={{ fontSize: 12, color: '#c4882a' }}
              className="hover:underline"
            >
              Ver todos
            </button>
          </div>
          {activos.length === 0 ? (
            <div className="px-5 py-10 text-center" style={{ color: '#7a6050', fontSize: 14 }}>
              No hay pedidos activos
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activos.map(p => (
                <div key={p.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: 14, color: '#f0e6d3', fontWeight: 500 }}>{p.cliente.nombre}</span>
                      <Badge estado={p.estado} />
                    </div>
                    <p style={{ fontSize: 12, color: '#7a6050' }}>
                      {p.items.length} producto{p.items.length !== 1 ? 's' : ''} · Entrega: {new Date(p.fechaEntrega).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: '#c4882a', fontWeight: 500 }}>
                    {fmt(p.precioFinal)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Top receta */}
          {recetaTop && (
            <div className="rounded-lg border border-border p-5" style={{ background: '#1c0d07' }}>
              <p style={{ fontSize: 11.5, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Receta más vendida
              </p>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#e8b84a', fontWeight: 600 }}>
                {recetaTop.nombre}
              </div>
              <p style={{ fontSize: 12, color: '#7a6050', marginTop: 4 }}>
                {recetaTop.vecesVendido} unidades vendidas
              </p>
              <div className="mt-4 h-1 rounded-full" style={{ background: '#3d2210' }}>
                <div
                  className="h-1 rounded-full"
                  style={{ width: '100%', background: 'linear-gradient(90deg, #c4882a, #e8b84a)' }}
                />
              </div>
            </div>
          )}

          {/* Recetas top list */}
          <div className="rounded-lg border border-border p-5" style={{ background: '#1c0d07' }}>
            <p style={{ fontSize: 11.5, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Ranking de recetas
            </p>
            {[...recetas]
              .sort((a, b) => b.vecesVendido - a.vecesVendido)
              .slice(0, 4)
              .map((r, i) => {
                const maxV = recetas.reduce((m, x) => Math.max(m, x.vecesVendido), 1)
                return (
                  <div key={r.id} className="mb-3 last:mb-0">
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: 12.5, color: '#c8b49a' }}>
                        <span style={{ color: '#7a6050', marginRight: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{i + 1}.</span>
                        {r.nombre}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#c4882a' }}>{r.vecesVendido}</span>
                    </div>
                    <div className="h-0.5 rounded-full" style={{ background: '#3d2210' }}>
                      <div
                        className="h-0.5 rounded-full transition-all"
                        style={{ width: `${(r.vecesVendido / maxV) * 100}%`, background: '#c4882a' }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Accesos rápidos */}
          <div className="rounded-lg border border-border p-4" style={{ background: '#1c0d07' }}>
            <p style={{ fontSize: 11.5, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Acceso rápido
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Nuevo pedido', view: 'pedidos' as View },
                { label: 'Ver insumos', view: 'insumos' as View },
                { label: 'Ver recetas', view: 'recetas' as View },
                { label: 'Ver historial', view: 'historial' as View },
              ].map(a => (
                <button
                  key={a.view}
                  onClick={() => onNavigate(a.view)}
                  className="rounded-md border border-border py-2 px-3 text-left transition-colors"
                  style={{ fontSize: 12, color: '#c8b49a', background: 'transparent' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(196,136,42,0.08)'
                    ;(e.currentTarget as HTMLElement).style.color = '#c4882a'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = '#c8b49a'
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
