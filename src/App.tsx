import { useState } from 'react'
import { StoreProvider } from './store'
import Dashboard from './views/Dashboard'
import Insumos from './views/Insumos'
import Recetas from './views/Recetas'
import Pedidos from './views/Pedidos'
import Historial from './views/Historial'

export type View = 'dashboard' | 'insumos' | 'recetas' | 'pedidos' | 'historial'

const nav: { id: View; label: string; d: string }[] = [
  {
    id: 'dashboard', label: 'Dashboard',
    d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    id: 'insumos', label: 'Insumos',
    d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    id: 'recetas', label: 'Recetas',
    d: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
  {
    id: 'pedidos', label: 'Pedidos',
    d: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  },
  {
    id: 'historial', label: 'Historial',
    d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
]

function Ico({ d }: { d: string }) {
  return (
    <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

function Shell() {
  const [view, setView] = useState<View>('dashboard')
  const [open, setOpen] = useState(true)

  return (
    <div className="flex h-full bg-bg overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 border-r border-border transition-all duration-200"
        style={{ width: open ? 220 : 60, backgroundColor: '#130906' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-border" style={{ padding: open ? '20px 16px' : '20px 11px' }}>
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full bg-gold text-bg font-bold"
            style={{ width: 34, height: 34, fontFamily: 'var(--font-display)', fontSize: 15 }}
          >
            D
          </div>
          {open && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#f0e6d3', fontWeight: 600, lineHeight: 1.2 }}>
                {"D'ChocolAte"}
              </div>
              <div style={{ fontSize: 11, color: '#7a6050', marginTop: 2 }}>Gestión de pedidos</div>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
          {nav.map(item => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                title={!open ? item.label : undefined}
                className="flex items-center gap-3 rounded-md transition-colors duration-150 w-full text-left"
                style={{
                  padding: open ? '9px 10px' : '9px 11px',
                  background: active ? 'rgba(196,136,42,0.15)' : 'transparent',
                  color: active ? '#c4882a' : '#7a6050',
                  border: active ? '1px solid rgba(196,136,42,0.25)' : '1px solid transparent',
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 400,
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = '#f0e6d3'
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = '#7a6050'
                }}
              >
                <Ico d={item.d} />
                {open && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="m-2 flex items-center justify-center rounded-md border border-border transition-colors duration-150"
          style={{ height: 34, color: '#7a6050', background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f0e6d3' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6050' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={open ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} />
          </svg>
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {view === 'dashboard' && <Dashboard onNavigate={setView} />}
        {view === 'insumos' && <Insumos />}
        {view === 'recetas' && <Recetas />}
        {view === 'pedidos' && <Pedidos />}
        {view === 'historial' && <Historial />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
