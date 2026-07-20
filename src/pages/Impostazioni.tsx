import { useEffect, useState } from 'react'
import { useProfilo, useTable } from '../lib/hooks'
import { Cliente, Fattura } from '../types'
import {
  DEFAULT_MODELS,
  LLMProvider,
  loadSettings,
  MODEL_OPTIONS,
  ModelOption,
  saveSettings,
  Settings,
} from '../lib/settings'
import { fetchOpenRouterModels } from '../services/llm'
import { importaDaFattureInCloud } from '../services/fattureInCloud'
import { arubaProvider } from '../services/sdi'
import { DATI_NORMATIVI_2026 } from '../engine/datiNormativi'
import { isSupabaseMode } from '../lib/db'

export default function Impostazioni() {
  const { profilo, update: updateProfilo } = useProfilo()
  const { insert: insertCliente, rows: clienti } = useTable<Cliente>('clienti')
  const { insert: insertFattura, rows: fatture } = useTable<Fattura>('fatture')
  const [s, setS] = useState<Settings>(loadSettings())
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [mostraNormativi, setMostraNormativi] = useState(false)

  function esportaDati() {
    const tabelle = ['profili_fiscali', 'clienti', 'fatture', 'f24_generati', 'scadenze', 'dichiarazioni', 'chat_messages']
    const data: Record<string, unknown> = { exportDate: new Date().toISOString(), version: 1 }
    for (const t of tabelle) {
      try {
        data[t] = JSON.parse(localStorage.getItem(`nf_db_${t}`) || '[]')
      } catch {
        data[t] = []
      }
    }
    data['settings'] = JSON.parse(localStorage.getItem('nf_settings') || '{}')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `neurora-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('Backup esportato.')
  }

  function ripristinaDati(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as Record<string, unknown>
        const tabelle = ['profili_fiscali', 'clienti', 'fatture', 'f24_generati', 'scadenze', 'dichiarazioni', 'chat_messages']
        for (const t of tabelle) {
          if (data[t]) localStorage.setItem(`nf_db_${t}`, JSON.stringify(data[t]))
        }
        if (data['settings']) localStorage.setItem('nf_settings', JSON.stringify(data['settings']))
        setMsg('Ripristino completato. Ricarica la pagina per vedere i dati.')
      } catch {
        setMsg('File non valido.')
      }
    }
    reader.readAsText(file)
  }
  // Lista modelli live di OpenRouter + modalità "scrivi a mano"
  const [orModels, setOrModels] = useState<ModelOption[]>([])
  const [orLoading, setOrLoading] = useState(false)
  const [modelManuale, setModelManuale] = useState(false)

  useEffect(() => {
    if (s.llm.provider !== 'openrouter' || orModels.length > 0) return
    setOrLoading(true)
    fetchOpenRouterModels()
      .then(setOrModels)
      .catch(() => setOrModels([])) // fallback: resta la lista curata
      .finally(() => setOrLoading(false))
  }, [s.llm.provider, orModels.length])

  const modelOptions: ModelOption[] =
    s.llm.provider === 'openrouter' && orModels.length > 0 ? orModels : MODEL_OPTIONS[s.llm.provider]
  const modelConosciuto = modelOptions.some((o) => o.value === s.llm.model)

  function salva(patch: Partial<Settings>) {
    const next = { ...s, ...patch }
    setS(next)
    saveSettings(next)
    setMsg('Impostazioni salvate.')
  }

  async function testAruba() {
    setBusy(true)
    setMsg('Test connessione Aruba in corso…')
    try {
      // il modo meno invasivo per testare le credenziali è richiedere un token
      await arubaProvider.testConnection()
      setMsg('✓ Connessione Aruba riuscita: credenziali valide.')
    } catch (e) {
      setMsg(
        `✗ Test Aruba fallito: ${e instanceof Error ? e.message : 'errore'}. Se è un errore CORS, le chiamate andranno instradate via Edge Function (vedi README) — le credenziali potrebbero comunque essere corrette.`
      )
    } finally {
      setBusy(false)
    }
  }

  async function migraFiC() {
    if (!profilo) return
    setBusy(true)
    setMsg('Migrazione da Fatture in Cloud in corso…')
    try {
      const atecoDefault = profilo.ateco_codici.find((a) => a.prevalente)?.codice || ''
      const res = await importaDaFattureInCloud(atecoDefault)
      let nuoviClienti = 0
      let nuoveFatture = 0
      for (const c of res.clienti) {
        const esiste = clienti.some(
          (x) => (c.piva && x.piva === c.piva) || x.denominazione === c.denominazione
        )
        if (!esiste) {
          await insertCliente(c)
          nuoviClienti++
        }
      }
      for (const f of res.fatture) {
        const esiste = fatture.some(
          (x) => x.numero === f.numero && x.data?.slice(0, 4) === f.data?.slice(0, 4)
        )
        if (!esiste) {
          await insertFattura(f)
          nuoveFatture++
        }
      }
      setMsg(
        `✓ Migrazione completata (clonazione — FiC resta attivo): ${nuoviClienti} clienti e ${nuoveFatture} fatture importate. Verifica i conteggi con FiC.`
      )
    } catch (e) {
      setMsg(`✗ Migrazione fallita: ${e instanceof Error ? e.message : 'errore'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Impostazioni</h1>
        <p className="text-sm text-slate-500">
          Profilo fiscale e chiavi API dei servizi esterni. Le chiavi restano nel tuo browser (localStorage) e vengono
          usate solo verso il rispettivo servizio.
        </p>
      </header>

      {msg && <div className="card text-sm border-blue-200 bg-blue-50 text-blue-800">{msg}</div>}

      {/* ————— Profilo fiscale ————— */}
      {profilo && (
        <section className="card space-y-4">
          <h2 className="font-bold">Profilo fiscale</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo label="Denominazione" value={profilo.denominazione} onSave={(v) => updateProfilo(profilo.id, { denominazione: v })} />
            <Campo label="Partita IVA" value={profilo.piva} onSave={(v) => updateProfilo(profilo.id, { piva: v })} />
            <Campo label="Codice fiscale" value={profilo.cf} onSave={(v) => updateProfilo(profilo.id, { cf: v })} />
            <Campo label="Indirizzo" value={profilo.indirizzo} onSave={(v) => updateProfilo(profilo.id, { indirizzo: v })} />
            <Campo label="Comune" value={profilo.comune} onSave={(v) => updateProfilo(profilo.id, { comune: v })} />
            <Campo label="PEC" value={profilo.pec} onSave={(v) => updateProfilo(profilo.id, { pec: v })} />
          </div>
          <p className="text-xs text-slate-400">
            Regime forfettario · aliquota {profilo.aliquota_sostitutiva * 100}% · INPS Gestione Separata{' '}
            {profilo.aliquota_inps * 100}% · ATECO {profilo.ateco_codici.map((a) => a.codice).join(', ')} (coeff. 67%).
            REA/ATECO secondario: da verificare su visura camerale aggiornata.
          </p>
        </section>
      )}

      {/* ————— Aruba SDI ————— */}
      <section className="card space-y-4">
        <div>
          <h2 className="font-bold">Fatturazione elettronica — Aruba (provider SDI)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Richiede il servizio Aruba Fatturazione Elettronica con utenza <strong>Premium</strong> (i Web Services non
            sono inclusi nel piano base). Con le credenziali inserite, il pulsante "Invia SDI" nelle fatture diventa
            attivo. In alternativa puoi sempre scaricare l'XML e caricarlo a mano sul pannello Aruba.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Username Aruba</label>
            <input
              className="input"
              value={s.aruba.username}
              onChange={(e) => setS({ ...s, aruba: { ...s.aruba, username: e.target.value } })}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label">Password Aruba</label>
            <input
              className="input"
              type="password"
              value={s.aruba.password}
              onChange={(e) => setS({ ...s, aruba: { ...s.aruba, password: e.target.value } })}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">URL autenticazione</label>
            <input
              className="input num"
              value={s.aruba.authUrl}
              onChange={(e) => setS({ ...s, aruba: { ...s.aruba, authUrl: e.target.value } })}
            />
          </div>
          <div>
            <label className="label">URL API</label>
            <input
              className="input num"
              value={s.aruba.apiUrl}
              onChange={(e) => setS({ ...s, aruba: { ...s.aruba, apiUrl: e.target.value } })}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => salva({ aruba: s.aruba })}>Salva</button>
          <button className="btn-secondary" onClick={testAruba} disabled={busy || !s.aruba.username}>
            Test connessione
          </button>
        </div>
      </section>

      {/* ————— LLM ————— */}
      <section className="card space-y-4">
        <div>
          <h2 className="font-bold">Commercialista AI — provider LLM</h2>
          <p className="text-xs text-slate-400 mt-1">
            Scegli il provider e inserisci la tua chiave API. Con <strong>OpenRouter</strong> usi un'unica chiave per
            tutti i modelli: incolla la chiave <code>sk-or-...</code> e scrivi il modello nel formato{' '}
            <code>autore/modello</code> (es. <code>anthropic/claude-haiku-4.5</code>, <code>openai/gpt-4o-mini</code>,{' '}
            <code>google/gemini-2.0-flash-001</code>). La chiave resta nel tuo browser.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Provider</label>
            <select
              className="input"
              value={s.llm.provider}
              onChange={(e) => {
                const provider = e.target.value as LLMProvider
                setModelManuale(false)
                setS({ ...s, llm: { ...s.llm, provider, model: DEFAULT_MODELS[provider] } })
              }}
            >
              <option value="openrouter">OpenRouter (tutti i modelli)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="groq">Groq (Llama)</option>
            </select>
          </div>
          <div>
            <label className="label">Chiave API</label>
            <input
              className="input"
              type="password"
              placeholder="sk-..."
              value={s.llm.apiKey}
              onChange={(e) => setS({ ...s, llm: { ...s.llm, apiKey: e.target.value } })}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">
              Modello {orLoading && <span className="text-slate-400 normal-case">— carico la lista…</span>}
            </label>
            <select
              className="input"
              value={modelManuale || !modelConosciuto ? '__manuale__' : s.llm.model}
              onChange={(e) => {
                if (e.target.value === '__manuale__') {
                  setModelManuale(true)
                } else {
                  setModelManuale(false)
                  setS({ ...s, llm: { ...s.llm, model: e.target.value } })
                }
              }}
            >
              {modelOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
              <option value="__manuale__">✏️ Altro (scrivi a mano)…</option>
            </select>
            {(modelManuale || !modelConosciuto) && (
              <input
                className="input num mt-2"
                placeholder="es. anthropic/claude-haiku-4.5"
                value={s.llm.model}
                onChange={(e) => setS({ ...s, llm: { ...s.llm, model: e.target.value } })}
              />
            )}
          </div>
        </div>
        <button className="btn-primary" onClick={() => salva({ llm: s.llm })}>Salva</button>
      </section>

      {/* ————— Email / n8n ————— */}
      <section className="card space-y-4">
        <div>
          <h2 className="font-bold">Alert proattivi — email e automazioni</h2>
          <p className="text-xs text-slate-400 mt-1">
            La chiave Resend e l'URL webhook n8n servono alle automazioni esterne (alert scadenze via email, sintesi
            settimanale). Qui vengono solo conservati: configurali poi nel workflow n8n su Hostinger.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Chiave API Resend</label>
            <input
              className="input"
              type="password"
              placeholder="re_..."
              value={s.email.resendApiKey}
              onChange={(e) => setS({ ...s, email: { ...s.email, resendApiKey: e.target.value } })}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Email destinatario alert</label>
            <input
              className="input"
              type="email"
              value={s.email.destinatario}
              onChange={(e) => setS({ ...s, email: { ...s.email, destinatario: e.target.value } })}
            />
          </div>
          <div>
            <label className="label">URL webhook n8n</label>
            <input
              className="input num"
              placeholder="https://n8n.tuodominio.it/webhook/..."
              value={s.n8nWebhookUrl}
              onChange={(e) => setS({ ...s, n8nWebhookUrl: e.target.value })}
            />
          </div>
        </div>
        <button className="btn-primary" onClick={() => salva({ email: s.email, n8nWebhookUrl: s.n8nWebhookUrl })}>
          Salva
        </button>
      </section>

      {/* ————— Fatture in Cloud ————— */}
      <section className="card space-y-4">
        <div>
          <h2 className="font-bold">Migrazione da Fatture in Cloud</h2>
          <p className="text-xs text-slate-400 mt-1">
            Clonazione one-time (D-008): clienti e fatture vengono copiati, FiC resta attivo come fallback. Ottieni un
            access token da developers.fattureincloud.it (app personale) e l'ID azienda dal tuo account.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Access token</label>
            <input
              className="input"
              type="password"
              value={s.fattureInCloud.accessToken}
              onChange={(e) =>
                setS({ ...s, fattureInCloud: { ...s.fattureInCloud, accessToken: e.target.value } })
              }
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Company ID</label>
            <input
              className="input num"
              value={s.fattureInCloud.companyId}
              onChange={(e) =>
                setS({ ...s, fattureInCloud: { ...s.fattureInCloud, companyId: e.target.value } })
              }
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => salva({ fattureInCloud: s.fattureInCloud })}>Salva</button>
          <button
            className="btn-secondary"
            onClick={migraFiC}
            disabled={busy || !s.fattureInCloud.accessToken || !s.fattureInCloud.companyId}
          >
            Avvia migrazione
          </button>
        </div>
      </section>

      {/* ————— Database ————— */}
      <section className="card space-y-2">
        <h2 className="font-bold">Database</h2>
        <p className="text-sm text-slate-600">
          Modalità attuale: <strong>{isSupabaseMode ? 'Supabase (cloud)' : 'locale (browser)'}</strong>.
        </p>
        <p className="text-xs text-slate-400">
          Per passare a Supabase: crea un progetto su supabase.com, esegui la migrazione SQL in{' '}
          <code>supabase/migrations/001_schema.sql</code>, poi imposta <code>VITE_SUPABASE_URL</code> e{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> nel file <code>.env</code> e riavvia l'app. Le tabelle coincidono, quindi
          il passaggio non richiede modifiche al codice.
        </p>
      </section>

      {/* ————— Backup dati ————— */}
      <section className="card space-y-3">
        <h2 className="font-bold">Backup e ripristino dati</h2>
        <p className="text-xs text-slate-400">
          Esporta tutti i dati in un file JSON (utile in modalit\u00e0 locale per non perdere i dati se svuoti il browser).
          Il ripristino sovrascrive i dati attuali con quelli del file.
        </p>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={esportaDati}>\u2193 Esporta JSON</button>
          <label className="btn-secondary cursor-pointer">
            \u2191 Ripristina
            <input type="file" accept=".json" className="hidden" onChange={ripristinaDati} />
          </label>
        </div>
      </section>

      {/* ————— Dati normativi ————— */}
      <section className="card">
        <button className="font-bold w-full text-left" onClick={() => setMostraNormativi(!mostraNormativi)}>
          Parametri normativi 2026 (verificati) {mostraNormativi ? '▾' : '▸'}
        </button>
        {mostraNormativi && (
          <table className="w-full text-xs mt-3">
            <thead>
              <tr>
                <th className="th">Chiave</th>
                <th className="th">Valore</th>
                <th className="th">Fonte</th>
                <th className="th">Verificato</th>
              </tr>
            </thead>
            <tbody>
              {DATI_NORMATIVI_2026.map((d) => (
                <tr key={d.chiave}>
                  <td className="td num">{d.chiave}</td>
                  <td className="td num font-semibold">{String(d.valore)}</td>
                  <td className="td">{d.fonte}</td>
                  <td className="td num">{d.data_verifica}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function Campo({
  label,
  value,
  onSave,
}: {
  label: string
  value: string
  onSave: (v: string) => void
}) {
  const [v, setV] = useState(value)
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} />
    </div>
  )
}
