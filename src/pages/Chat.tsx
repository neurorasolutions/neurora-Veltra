import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfilo, useTable } from '../lib/hooks'
import { ChatMessage, F24Doc, Fattura, Scadenza } from '../types'
import { calcolaPrevisione, fmtEuro } from '../engine/fiscale'
import { buildSystemPrompt, chatLLM, DISCLAIMER } from '../services/llm'
import { isLLMConfigured, loadSettings } from '../lib/settings'

export default function Chat() {
  const { profilo } = useProfilo()
  const { rows: fatture } = useTable<Fattura>('fatture')
  const { rows: scadenze } = useTable<Scadenza>('scadenze')
  const { rows: f24docs } = useTable<F24Doc>('f24_generati')
  const { rows: storico, insert } = useTable<ChatMessage>('chat_messages')

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const configured = isLLMConfigured(loadSettings())
  const messaggi = [...storico].sort((a, b) =>
    (a.created_at || '').localeCompare(b.created_at || '')
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi.length, busy])

  function contestoFiscale(): string {
    if (!profilo) return 'Profilo non disponibile.'
    const anno = new Date().getFullYear()
    const prev = calcolaPrevisione(fatture, profilo, anno)
    const prossime = scadenze
      .filter((s) => s.stato !== 'completata')
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 5)
      .map((s) => `- ${s.data}: ${s.descrizione}${s.importo_stimato ? ` (${fmtEuro(s.importo_stimato)})` : ''}`)
      .join('\n')
    const f24 = f24docs
      .slice(0, 5)
      .map((d) => `- F24 ${d.tipo} anno ${d.anno_riferimento}: ${fmtEuro(d.totale)} (${d.stato})`)
      .join('\n')
    return `Profilo: ${profilo.denominazione}, P.IVA ${profilo.piva}, regime forfettario dal ${profilo.data_apertura_piva}.
ATECO: ${profilo.ateco_codici.map((a) => `${a.codice} (coeff. ${a.coeff * 100}%)`).join(', ')}.
Aliquota imposta sostitutiva: ${profilo.aliquota_sostitutiva * 100}% · INPS Gestione Separata ${profilo.aliquota_inps * 100}%.

Previsione ${anno} (motore deterministico):
- Ricavi fatturati: ${fmtEuro(prev.ricaviTotali)}
- Reddito imponibile: ${fmtEuro(prev.redditoImponibile)}
- Contributi INPS stimati: ${fmtEuro(prev.contributiInpsStimati)}
- Imposta sostitutiva stimata: ${fmtEuro(prev.impostaSostitutiva)}
- Totale da accantonare: ${fmtEuro(prev.totaleDovutoStimato)}
- Residuo soglia 85.000 €: ${fmtEuro(prev.residuoSoglia)}

Prossime scadenze:\n${prossime || '- nessuna'}

F24 recenti:\n${f24 || '- nessuno'}`
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const domanda = input.trim()
    if (!domanda || busy) return
    setInput('')
    setErrore('')
    setBusy(true)
    await insert({ role: 'user', content: domanda })
    try {
      const history = [...messaggi, { role: 'user' as const, content: domanda }].map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      const risposta = await chatLLM(history.slice(-12), buildSystemPrompt(contestoFiscale()))
      await insert({ role: 'assistant', content: risposta })
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold">Commercialista AI</h1>
        <p className="text-sm text-slate-500">{DISCLAIMER}</p>
      </header>

      {!configured && (
        <div className="card border-amber-200 bg-amber-50 text-amber-800 text-sm mb-4">
          Per usare il commercialista AI inserisci la chiave API del provider LLM in{' '}
          <Link to="/impostazioni" className="font-bold underline">Impostazioni</Link>. Provider supportati: Anthropic
          (consigliato), OpenAI, Groq.
        </div>
      )}

      <div className="flex-1 overflow-y-auto card space-y-4">
        {messaggi.length === 0 && (
          <div className="text-sm text-slate-400 space-y-3">
            <p>Chiedi qualcosa al tuo commercialista AI:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Quanto devo accantonare per le tasse quest\'anno?',
                'Come funzionano gli acconti a giugno e novembre?',
                'Cosa succede se supero gli 85.000 € di ricavi?',
                'Come si applica il bollo da 2 € sulle mie fatture?',
                'Cos\'è il ravvedimento operoso?',
              ].map((q) => (
                <button
                  key={q}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full px-3 py-1.5 transition-colors"
                  onClick={() => setInput(q)}
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-xs">L'AI riceve i tuoi dati fiscali calcolati dal motore deterministico: non inventa numeri.</p>
          </div>
        )}
        {messaggi.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-slate-400 animate-pulse">Il commercialista AI sta scrivendo…</div>}
        {errore && <div className="text-sm text-rose-600">Errore: {errore}</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <input
          className="input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={configured ? 'Scrivi la tua domanda fiscale…' : 'Configura prima la chiave API in Impostazioni'}
          disabled={!configured || busy}
        />
        <button className="btn-primary" type="submit" disabled={!configured || busy || !input.trim()}>
          Invia
        </button>
      </form>
    </div>
  )
}
