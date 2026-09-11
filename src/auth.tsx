import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, AuthError } from './api'

type AuthCtx = {
  ready: boolean
  setupRequired: boolean
  user: string | null
  login: (username: string, password: string) => Promise<void>
  setup: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const Auth = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [setupRequired, setSetupRequired] = useState(false)
  const [user, setUser] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const status = await api.authStatus()
    setSetupRequired(status.setupRequired)
    setUser(status.authenticated ? status.username : null)
  }, [])

  useEffect(() => {
    refresh()
      .catch(() => {
        setUser(null)
        setSetupRequired(false)
      })
      .finally(() => setReady(true))
  }, [refresh])

  useEffect(() => {
    const onExpired = () => { void refresh() }
    window.addEventListener('dc-auth-required', onExpired)
    return () => window.removeEventListener('dc-auth-required', onExpired)
  }, [refresh])

  const login = async (username: string, password: string) => {
    const result = await api.login(username, password)
    setSetupRequired(false)
    setUser(result.username)
  }

  const setup = async (username: string, password: string) => {
    const result = await api.setup(username, password)
    setSetupRequired(false)
    setUser(result.username)
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (err) {
      if (!(err instanceof AuthError)) throw err
    }
    setUser(null)
  }

  return (
    <Auth.Provider value={{ ready, setupRequired, user, login, setup, logout }}>
      {children}
    </Auth.Provider>
  )
}

export const useAuth = () => useContext(Auth)
