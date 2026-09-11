import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth'

const inputCls = 'w-full rounded-md border border-border bg-bg px-3 py-2.5 text-cream text-sm outline-none focus:border-gold transition-colors'

export default function Login() {
  const { setupRequired, login, setup } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (setupRequired && password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setBusy(true)
    try {
      if (setupRequired) await setup(username, password)
      else await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full flex items-center justify-center p-6" style={{ background: '#0f0804' }}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-border p-8"
        style={{ background: '#1c0d07' }}
      >
        <div className="flex flex-col items-center mb-7">
          <div
            className="flex items-center justify-center rounded-full bg-gold text-bg font-bold mb-4"
            style={{ width: 52, height: 52, fontFamily: 'var(--font-display)', fontSize: 22 }}
          >
            D
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: '#f0e6d3', fontWeight: 600 }}>
            {"D'ChocolAte"}
          </h1>
          <p style={{ fontSize: 13, color: '#7a6050', marginTop: 6, textAlign: 'center' }}>
            {setupRequired ? 'Creá el primer acceso para proteger tus datos' : 'Ingresá para continuar'}
          </p>
        </div>

        <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Usuario
        </label>
        <input
          className={inputCls}
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />

        <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 6px' }}>
          Contraseña
        </label>
        <input
          className={inputCls}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete={setupRequired ? 'new-password' : 'current-password'}
          required
          minLength={setupRequired ? 8 : undefined}
        />

        {setupRequired && (
          <>
            <label style={{ display: 'block', fontSize: 11.5, color: '#7a6050', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 6px' }}>
              Confirmar contraseña
            </label>
            <input
              className={inputCls}
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </>
        )}

        {error && (
          <p className="mt-4 text-sm" style={{ color: '#c44a4a' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg py-2.5 mt-6 text-sm font-medium transition-colors"
          style={{ background: '#c4882a', color: '#0f0804', opacity: busy ? 0.7 : 1 }}
        >
          {busy ? 'Esperá...' : setupRequired ? 'Crear acceso' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
