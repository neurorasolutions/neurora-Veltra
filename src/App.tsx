import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Fatture from './pages/Fatture'
import Clienti from './pages/Clienti'
import Previsione from './pages/Previsione'
import F24Page from './pages/F24'
import Dichiarazione from './pages/Dichiarazione'
import Chat from './pages/Chat'
import Impostazioni from './pages/Impostazioni'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './lib/auth-context'
import { isSupabaseMode } from './lib/db'
import { signOut } from './lib/auth'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 animate-pulse">Caricamento…</div>
      </div>
    )
  }
  // In modalità locale (no Supabase), salta l'auth
  if (!isSupabaseMode) return <>{children}</>
  if (!user) return <Login />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/fatture" element={<Fatture />} />
            <Route path="/clienti" element={<Clienti />} />
            <Route path="/previsione" element={<Previsione />} />
            <Route path="/f24" element={<F24Page />} />
            <Route path="/dichiarazione" element={<Dichiarazione />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/impostazioni" element={<Impostazioni />} />
          </Routes>
        </Layout>
      </AuthGuard>
    </AuthProvider>
  )
}
