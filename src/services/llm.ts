// Commercialista AI — client LLM unificato (Anthropic / OpenAI / Groq / OpenRouter / Ollama).
// Il provider e la chiave API si impostano nella pagina Impostazioni (CA-001).
// L'AI è un layer consultivo (D-005): i numeri veri arrivano dal motore di
// calcolo deterministico, passati nel contesto di sistema.
//
// Fallback CORS automatico: se la chiamata diretta dal browser fallisce per un
// errore di rete/CORS (es. Ollama Cloud non supporta CORS), la richiesta viene
// instradata attraverso la Supabase Edge Function `ai-proxy` (lato server).

import { loadSettings, ModelOption } from '../lib/settings'

// Scarica la lista aggiornata dei modelli da OpenRouter (endpoint pubblico, CORS ok).
export async function fetchOpenRouterModels(): Promise<ModelOption[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models')
  if (!res.ok) throw new Error(`Impossibile scaricare i modelli OpenRouter (HTTP ${res.status})`)
  const data = (await res.json()) as { data?: { id: string; name?: string }[] }
  return (data.data || [])
    .map((m) => ({ value: String(m.id), label: String(m.name || m.id) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
}

export const DISCLAIMER =
  'Le risposte del commercialista AI sono informative e non sostituiscono il parere di un professionista abilitato.'

function isTransportError(e: unknown): boolean {
  return (
    e instanceof TypeError ||
    (e instanceof Error && /failed to fetch|networkerror|load failed|network request failed/i.test(e.message))
  )
}

function proxyUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  return base ? `${base.replace(/\/+$/, '')}/functions/v1/ai-proxy` : ''
}

function proxyHeaders(): Record<string, string> {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (anon) {
    h.Authorization = `Bearer ${anon}`
    h.apikey = anon
  }
  return h
}

export async function chatLLM(messages: LLMMessage[], systemPrompt: string): Promise<string> {
  try {
    return await chatLLMDiretto(messages, systemPrompt)
  } catch (e) {
    if (isTransportError(e) && proxyUrl()) {
      return await chatLLMProxy(messages, systemPrompt)
    }
    throw e
  }
}

async function chatLLMDiretto(messages: LLMMessage[], systemPrompt: string): Promise<string> {
  const s = loadSettings()
  const hasKey = s.llm.provider === 'ollama' ? !!s.ollama.apiKey : !!s.llm.apiKey
  if (!hasKey) {
    throw new Error(
      'Nessuna chiave API configurata. Vai in Impostazioni → Commercialista AI e inserisci la chiave del provider scelto.'
    )
  }

  switch (s.llm.provider) {
    case 'anthropic': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': s.llm.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: s.llm.model,
          max_tokens: 1500,
          system: systemPrompt,
          messages,
        }),
      })
      if (!res.ok) throw new Error(`Errore API Anthropic (HTTP ${res.status}): ${await res.text()}`)
      const data = await res.json()
      return data.content?.[0]?.text || ''
    }
    case 'openai':
    case 'groq':
    case 'openrouter':
    case 'ollama': {
      const base =
        s.llm.provider === 'openai'
          ? 'https://api.openai.com/v1'
          : s.llm.provider === 'groq'
            ? 'https://api.groq.com/openai/v1'
            : s.llm.provider === 'ollama'
              ? (import.meta.env.DEV ? '/ollama-api/v1' : `${s.ollama.apiUrl}/v1`)
              : 'https://openrouter.ai/api/v1'
      const apiKey = s.llm.provider === 'ollama' ? s.ollama.apiKey : s.llm.apiKey
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }
      // OpenRouter consiglia (facoltativi) questi header per identificare l'app
      if (s.llm.provider === 'openrouter') {
        headers['HTTP-Referer'] = window.location.origin
        headers['X-Title'] = 'VELTRA by Neurora'
      }
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: s.llm.model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: 1500,
        }),
      })
      if (!res.ok) throw new Error(`Errore API ${s.llm.provider} (HTTP ${res.status}): ${await res.text()}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content || ''
    }
  }
}

async function chatLLMProxy(messages: LLMMessage[], systemPrompt: string): Promise<string> {
  const s = loadSettings()
  const url = proxyUrl()
  if (!url) throw new Error('Proxy AI non configurato: imposta VITE_SUPABASE_URL e deploya la Edge Function ai-proxy.')
  const res = await fetch(url, {
    method: 'POST',
    headers: proxyHeaders(),
    body: JSON.stringify({
      action: 'chat',
      provider: s.llm.provider,
      apiKey: s.llm.apiKey,
      ollamaApiKey: s.ollama.apiKey,
      apiUrl: s.ollama.apiUrl,
      model: s.llm.model,
      messages,
      systemPrompt,
    }),
  })
  if (!res.ok) {
    throw new Error(`Proxy AI HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const data = await res.json()
  if (data.errore) throw new Error(data.errore)
  return data.content || ''
}

export function buildSystemPrompt(contestoFiscale: string, aggiornamentiNormativi = ''): string {
  return `Sei il "commercialista AI" di una piattaforma fiscale per Partite IVA italiane in regime forfettario.

REGOLE:
1. Rispondi SOLO su temi fiscali/contributivi italiani, con focus sul regime forfettario (L. 190/2014).
2. I dati fiscali REALI dell'utente (fatture, ricavi, previsioni tasse, scadenze, F24) ti sono GIÀ forniti qui sotto nella sezione "CONTESTO FISCALE DELL'UTENTE", calcolati dal motore deterministico della piattaforma. Quando l'utente ti chiede dei SUOI dati o delle sue fatture, rispondi USANDO quei numeri. NON dire mai che non puoi accedere ai suoi dati: puoi, perché sono già nel tuo contesto. Ciò che NON hai sono solo i file PDF/allegati grezzi, i conti bancari e le piattaforme esterne.
3. NON inventare numeri: se un dato non è presente nel contesto, dillo esplicitamente e chiedi all'utente di fornirtelo.
4. Cita sempre la fonte normativa quando fai affermazioni (es. "art. 1 c.54 L.190/2014").
5. Non sei un professionista abilitato: per decisioni importanti raccomanda la verifica con un commercialista.
6. Rispondi in italiano, in modo chiaro e conciso.
7. Se l'utente chiede "dove trovo/vedo/recupero" un DATO (es. "quanto ho già versato", "dove vedo le mie fatture"), rispondi indicando la pagina dell'app corrispondente (F24, Fatture, Dichiarazione, Previsione) e riportando il dato REALE dal contesto. "Recuperare un dato" significa trovare l'informazione: NON interpretarlo come richiesta di rimborso, salvo che l'utente non lo dica esplicitamente.

CONTESTO FISCALE DELL'UTENTE (calcolato dal motore deterministico):
${contestoFiscale}

PARAMETRI NORMATIVI 2026 (verificati):
- Imposta sostitutiva forfettario: 15% (5% primi 5 anni)
- Coefficiente redditività ATECO 59.20.3 e 62.01.00: 67%
- INPS Gestione Separata: 26,07% (causale F24: P10)
- Soglia ricavi: 85.000 € (esclusione immediata oltre 100.000 €)
- Acconti: 50% + 50% (soggetti ISA, art. 58 DL 124/2019), metodo storico
- Codici tributo: 1790 (saldo), 1791 (1° acconto), 1792 (2° acconto)
- Bollo 2 € su fatture > 77,47 € — codici trimestrali 2521-2524
- Tasso legale 2026: 1,60% — Sanzione base omesso versamento: 25%
- Scadenze 2026: F24 30/6 e 30/11, Redditi PF 2/11

PORTALI UFFICIALI ITALIANI (per indirizzare l'utente dove reperire i propri dati — tu NON puoi accedervi direttamente, ma indichi sempre il portale giusto e cosa cercare):
- Agenzia delle Entrate (area riservata / Cassetto fiscale): https://www.agenziaentrate.gov.it — versamenti F24, dichiarazioni presentate, rimborsi, fatture elettroniche
- Fisconline: https://telematici.agenziaentrate.gov.it — invio e consultazione dichiarazioni (accesso SPID/CIE/CNS)
- INPS (Cassetto previdenziale): https://www.inps.it — contributi Gestione Separata, estratto conto contributivo, mod. F24 INPS
- Fatture e Corrispettivi (SDI): https://ivaservizi.agenziaentrate.gov.it — consultazione fatture elettroniche emesse e ricevute
- Agenzia delle Entrate-Riscossione: https://www.agenziaentrateriscossione.gov.it — cartelle di pagamento, rateizzazioni, situazione debitoria

IMPORTANTE — Le tue conoscenze possono essere datate. Se ci sono aggiornamenti normativi sotto, usa quelli come fonte piu recente e cita la fonte.

AGGIORNAMENTI NORMATIVI E RISULTATI WEB:
${aggiornamentiNormativi || "Nessun aggiornamento esterno disponibile. Avvisa l'utente che le informazioni potrebbero non essere aggiornate all'ultima normativa."}`
}
