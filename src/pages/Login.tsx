import { useEffect, useState } from 'react'
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../lib/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [errore, setErrore] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setErrore('')
    setInfo('')
  }, [mode])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrore('')
    setInfo('')
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password)
        setInfo('Controlla la tua email per confermare la registrazione, poi accedi.')
        setMode('login')
      }
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-3xl font-extrabold bg-neurora-gradient bg-clip-text text-transparent">
            Neurora Fiscale
          </div>
          <p className="text-sm text-slate-500 mt-1">Il gestionale fiscale che pensa per te</p>
        </div>

        <div className="card space-y-4">
          <button
            onClick={() => signInWithGoogle()}
            disabled={busy}
            className="btn btn-secondary w-full justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.2 36.1 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
            </svg>
            Continua con Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">oppure</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="davide@neurora.it"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Almeno 6 caratteri"
                required
                minLength={6}
              />
            </div>

            {errore && <p className="text-sm text-rose-600">{errore}</p>}
            {info && <p className="text-sm text-emerald-600">{info}</p>}

            <button className="btn btn-primary w-full justify-center" type="submit" disabled={busy}>
              {busy ? 'Attendi…' : mode === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          </form>

          <button
            className="text-sm text-slate-500 hover:text-accent w-full text-center"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
          </button>
        </div>
      </div>
    </div>
  )
}
