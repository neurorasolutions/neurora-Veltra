// Commercialista AI — client LLM unificato (Anthropic / OpenAI / Groq).
// Il provider e la chiave API si impostano nella pagina Impostazioni (CA-001).
// L'AI è un layer consultivo (D-005): i numeri veri arrivano dal motore di
// calcolo deterministico, passati nel contesto di sistema.

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

export async function chatLLM(messages: LLMMessage[], systemPrompt: string): Promise<string> {
  const s = loadSettings()
  if (!s.llm.apiKey) {
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
              ? `${s.ollama.apiUrl}/v1`
              : 'https://openrouter.ai/api/v1'
      const apiKey = s.llm.provider === 'ollama' ? s.ollama.apiKey : s.llm.apiKey
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }
      // OpenRouter consiglia (facoltativi) questi header per identificare l'app
      if (s.llm.provider === 'openrouter') {
        headers['HTTP-Referer'] = window.location.origin
        headers['X-Title'] = 'Neurora Fiscale'
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

export function buildSystemPrompt(contestoFiscale: string): string {
  return `Sei il "commercialista AI" di una piattaforma fiscale per Partite IVA italiane in regime forfettario.

REGOLE:
1. Rispondi SOLO su temi fiscali/contributivi italiani, con focus sul regime forfettario (L. 190/2014).
2. NON inventare numeri: i calcoli ufficiali dell'utente sono nel contesto qui sotto, calcolati da un motore deterministico. Se un dato non c'è, dillo.
3. Cita sempre la fonte normativa quando fai affermazioni (es. "art. 1 c.54 L.190/2014").
4. Non sei un professionista abilitato: per decisioni importanti raccomanda la verifica con un commercialista.
5. Rispondi in italiano, in modo chiaro e conciso.

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
- Scadenze 2026: F24 30/6 e 30/11, Redditi PF 2/11`
}
