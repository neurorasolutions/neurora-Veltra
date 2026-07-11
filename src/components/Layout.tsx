import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { isSupabaseMode } from '../lib/db'
import { useAuth } from '../lib/auth-context'
import { signOut } from '../lib/auth'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◫' },
  { to: '/fatture', label: 'Fatture', icon: '⎘' },
  { to: '/clienti', label: 'Clienti', icon: '⊙' },
  { to: '/previsione', label: 'Previsione tasse', icon: '∑' },
  { to: '/f24', label: 'F24', icon: '▤' },
  { to: '/dichiarazione', label: 'Dichiarazione', icon: '✓' },
  { to: '/chat', label: 'Commercialista AI', icon: '✦' },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙' },
]

function UserBadge() {
  const { user } = useAuth()
  if (!user) return null
  const email = user.email || ''
  const name = user.user_metadata?.full_name || email.split('@')[0]
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-8 h-8 rounded-full bg-neurora-gradient flex items-center justify-center text-white font-bold text-sm shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-slate-700 font-semibold truncate">{name}</div>
        <button
          className="text-slate-400 hover:text-rose-500 transition-colors"
          onClick={() => signOut()}
        >
          Esci
        </button>
      </div>
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="no-print w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <div className="text-lg font-extrabold bg-neurora-gradient bg-clip-text text-transparent">
            Neurora Fiscale
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Regime forfettario · {isSupabaseMode ? 'Supabase' : 'modalità locale'}
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span className="w-5 text-center">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-2">
          {isSupabaseMode && <UserBadge />}
          <div className="text-[11px] text-slate-400">
            Il gestionale fiscale che pensa per te.
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
    </div>
  )
}
