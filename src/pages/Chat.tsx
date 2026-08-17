import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfilo, useTable } from '../lib/hooks'
import { ChatMessage, ChatSessione, F24Doc, Fattura, Scadenza } from '../types'
import { calcolaPrevisione, fmtEuro } from '../engine/fiscale'
import { buildSystemPrompt, chatLLM, DISCLAIMER } from '../services/llm'
import { isLLMConfigured, loadSettings } from '../lib/settings'
import { searchRelevantNews } from '../services/ragNews'
import { webSearch, formatContextForPrompt, SearchResult } from '../services/webSearch'

export default function Chat() {
  const { profilo } = useProfilo()
  const { rows: fatture } = useTable<Fattura>('fatture')
  const { rows: scadenze } = useTable<Scadenza>('scadenze')
  const { rows: f24docs } = useTable<F24Doc>('f24_generati')
  const { rows: sessioni, insert: insertSessione, update: updateSessione, remove: deleteSessione, reload: reloadSessioni } =
    useTable<ChatSessione>('chat_sessioni')
  const { rows: allMessages, insert: insertMessage, remove: deleteMessage, reload: reloadMessages } =
    useTable<ChatMessage>('chat_messages')

  const [sessioneAttiva, setSessioneAttiva] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState('')
  const [fonti, setFonti] = useState<{ titolo: string; url: string; fonte: string }[]>([])
  const [ragStatus, setRagStatus] = useState<'idle' | 'searching' | 'done'>('idle')
  const bottomRef = useRef<HTMLDivElement>(null)

  const configured = isLLMConfigured(loadSettings())

  // Auto-crea una sessione se non ce ne sono
  useEffect(() => {
    if (!sessioniLoading && sessioni.length === 0 && !sessioneAttiva) {
      insertSessione({ titolo: 'Nuova conversazione' } as Partial<ChatSessione>).then((s) => {
        setSessioneAttiva(s.id)
      })
    } else if (!sessioneAttiva && sessioni.length > 0) {
      setSessioneAttiva(sessioni[0].id)
    }
  }, [sessioni.length, sessioneAttiva])

  const sessioniLoading = false

  // Messaggi della sessione attiva
  const messaggi = allMessages
    .filter((m) => m.session_id === sessioneAttiva || (!m.session_id && !sessioneAttiva))
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi.length, busy])

  // Titolo sessione: usa primi 40 char del primo messaggio utente
  function autoTitolo(domanda: string, sid: string) {
    const msgs = allMessages.filter((m) => m.session_id === sid)
    const haTitoloCustom = sessioni.find((s) => s.id === sid)?.titolo !== 'Nuova conversazione'
    if (haTitoloCustom) return
    const titolo = domanda.length > 40 ? domanda.slice(0, 40) + '...' : domanda
    updateSessione(sid, { titolo } as Partial<ChatSessione>)
  }

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

    // Versamenti già effettuati (F24 segnati come "pagato")
    const pagati = f24docs.filter((d) => d.stato === 'pagato')
    const versatoTotale = pagati.reduce((s, d) => s + (d.totale || 0), 0)
    const versatoErario = pagati
      .flatMap((d) => d.righe)
      .filter((r) => r.sezione === 'erario')
      .reduce((s, r) => s + (r.importo || 0), 0)
    const versatoInps = pagati
      .flatMap((d) => d.righe)
      .filter((r) => r.sezione === 'inps')
      .reduce((s, r) => s + (r.importo || 0), 0)
    const versamenti = pagati.length > 0
      ? `${pagati.length} F24 "pagati" per un totale di ${fmtEuro(versatoTotale)} (erario ${fmtEuro(versatoErario)} · INPS ${fmtEuro(versatoInps)})`
      : 'nessun versamento registrato: per tracciarli, segna gli F24 come "Pagato" nella pagina F24'

    const f24 = f24docs
      .slice(0, 10)
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

Versamenti già effettuati: ${versamenti}

Prossime scadenze:\n${prossime || '- nessuna'}

F24 registrati:\n${f24 || '- nessuno'}`
  }

  async function nuovaChat() {
    const s = await insertSessione({ titolo: 'Nuova conversazione' } as Partial<ChatSessione>)
    setSessioneAttiva(s.id)
    setErrore('')
    setFonti([])
  }

  async function eliminaChat(sid: string) {
    // Elimina prima i messaggi della sessione
    const msgs = allMessages.filter((m) => m.session_id === sid)
    for (const m of msgs) {
      await deleteMessage(m.id)
    }
    await deleteSessione(sid)
    // Se era la sessione attiva, passa a un'altra o creane una nuova
    if (sessioneAttiva === sid) {
      const rimaste = sessioni.filter((s) => s.id !== sid)
      if (rimaste.length > 0) {
        setSessioneAttiva(rimaste[0].id)
      } else {
        const nuova = await insertSessione({ titolo: 'Nuova conversazione' } as Partial<ChatSessione>)
        setSessioneAttiva(nuova.id)
      }
    }
    reloadMessages()
    reloadSessioni()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const domanda = input.trim()
    if (!domanda || busy || !sessioneAttiva) return
    setInput('')
    setErrore('')
    setFonti([])
    setBusy(true)
    setRagStatus('searching')

    await insertMessage({ role: 'user', content: domanda, session_id: sessioneAttiva } as Partial<ChatMessage>)
    autoTitolo(domanda, sessioneAttiva)

    try {
      const s = loadSettings()
      let aggiornamenti = ''
      const tutteFonti: { titolo: string; url: string; fonte: string }[] = []

      let newsResults: Awaited<ReturnType<typeof searchRelevantNews>> = []
      let webResults: SearchResult[] = []
      const [ragP, wsP] = await Promise.allSettled([
        s.rag.enabled ? searchRelevantNews(domanda, 5) : Promise.resolve([] as Awaited<ReturnType<typeof searchRelevantNews>>),
        s.webSearch.enabled ? webSearch(domanda, 5) : Promise.resolve([] as SearchResult[]),
      ])
      if (ragP.status === 'fulfilled') {
        newsResults = ragP.value
        newsResults.forEach((n) => tutteFonti.push({ titolo: n.titolo, url: n.url, fonte: n.fonte }))
      }
      if (wsP.status === 'fulfilled') {
        webResults = wsP.value
        webResults.forEach((w) => tutteFonti.push({ titolo: w.titolo, url: w.url, fonte: w.fonte }))
      }

      aggiornamenti = formatContextForPrompt(
        newsResults.map((n) => ({
          titolo: n.titolo, fonte: n.fonte, contenuto: n.contenuto,
          url: n.url, data_pubblicazione: n.data_pubblicazione,
        })),
        webResults
      )

      setRagStatus('done')
      setFonti(tutteFonti)

      const history = [...messaggi, { role: 'user' as const, content: domanda }].map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      const risposta = await chatLLM(history.slice(-12), buildSystemPrompt(contestoFiscale(), aggiornamenti))
      await insertMessage({ role: 'assistant', content: risposta, session_id: sessioneAttiva } as Partial<ChatMessage>)
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setBusy(false)
      setRagStatus('idle')
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-6rem)]">
      {/* ————— Chat principale ————— */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="mb-4">
          <h1 className="text-2xl font-extrabold">Commercialista AI</h1>
          <p className="text-sm text-slate-500">{DISCLAIMER}</p>
        </header>

        {!configured && (
          <div className="card border-amber-200 bg-amber-50 text-amber-800 text-sm mb-4">
            Per usare il commercialista AI inserisci la chiave API del provider LLM in{' '}
            <Link to="/impostazioni" className="font-bold underline">Impostazioni</Link>.
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
          {busy && (
            <div className="text-sm text-slate-400 animate-pulse">
              {ragStatus === 'searching' ? 'Ricerca aggiornamenti normativi e web…' : 'Il commercialista AI sta scrivendo…'}
            </div>
          )}
          {fonti.length > 0 && !busy && (
            <div className="border-t pt-3 mt-2 space-y-1">
              <p className="text-xs font-semibold text-slate-500">Fonti consultate:</p>
              {fonti.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="block text-xs text-accent hover:underline truncate">
                  [{f.fonte}] {f.titolo}
                </a>
              ))}
            </div>
          )}
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

      {/* ————— Sidebar sessioni (destra) ————— */}
      <aside className="w-64 flex-shrink-0 flex flex-col">
        <button className="btn-primary text-sm mb-3" onClick={nuovaChat}>
          + Nuova chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {sessioni
            .slice()
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
            .map((sess) => (
              <div
                key={sess.id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  sessioneAttiva === sess.id ? 'bg-accent text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                onClick={() => setSessioneAttiva(sess.id)}
              >
                <span className="flex-1 text-sm truncate">{sess.titolo}</span>
                <button
                  className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs ${
                    sessioneAttiva === sess.id ? 'text-white hover:text-rose-200' : 'text-slate-400 hover:text-rose-500'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    eliminaChat(sess.id)
                  }}
                  title="Elimina conversazione"
                >
                  ✕
                </button>
              </div>
            ))}
        </div>
      </aside>
    </div>
  )
}
