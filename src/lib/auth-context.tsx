import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { isSupabaseMode } from './db'
import { onAuthChange, getSession } from './auth'
import { setTenantId } from './db'

interface AuthState {
  user: User | null
  loading: boolean
}

const Ctx = createContext<AuthState>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseMode) {
      // Modalità locale: nessun auth richiesta, sempre "loggato"
      setLoading(false)
      return
    }
    let unsub: (() => void) | undefined
    getSession().then((session) => {
      setUser(session?.user ?? null)
      setTenantId(session?.user?.id ?? 'local')
      setLoading(false)
    })
    unsub = onAuthChange((u) => {
      setUser(u)
      setTenantId(u?.id ?? 'local')
      setLoading(false)
    })
    return () => unsub?.()
  }, [])

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>
}

export function useAuth() {
  return useContext(Ctx)
}
