// Web search per il commercialista AI: cerca informazioni fiscali in tempo reale.
// Prova prima DuckDuckGo via allorigins (proxy CORS gratuito); se fallisce,
// ripiega sulla Supabase Edge Function `ai-proxy` (lato server, sempre funzionante).

export interface SearchResult {
  titolo: string
  url: string
  snippet: string
  fonte: string
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

export async function webSearch(query: string, limit = 5): Promise<SearchResult[]> {
  // Preferisce il proxy Edge Function (affidabile); allorigins solo come fallback.
  if (proxyUrl()) {
    try {
      return await webSearchProxy(query, limit)
    } catch {
      // prova il metodo diretto
    }
  }
  try {
    return await webSearchDiretto(query, limit)
  } catch {
    return []
  }
}

async function webSearchDiretto(query: string, limit = 5): Promise<SearchResult[]> {
  const enhancedQuery = `${query} fiscalita Italia 2026`
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(enhancedQuery)}`
  )}`
  const res = await fetch(proxyUrl)
  if (!res.ok) throw new Error(`Web search fallita (HTTP ${res.status})`)
  const html = await res.text()
  return parseDDGResults(html, limit)
}

async function webSearchProxy(query: string, limit = 5): Promise<SearchResult[]> {
  const url = proxyUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: proxyHeaders(),
    body: JSON.stringify({ action: 'search', query, limit }),
  })
  if (!res.ok) {
    throw new Error(`Proxy web search HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const data = await res.json()
  if (data.errore) throw new Error(data.errore)
  return data.results || []
}

function parseDDGResults(html: string, limit: number): SearchResult[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const results: SearchResult[] = []

  const resultBlocks = doc.querySelectorAll('.result, .web-result')
  resultBlocks.forEach((block) => {
    if (results.length >= limit) return
    const link = block.querySelector('.result__a, .result-link') as HTMLAnchorElement | null
    const snippet = block.querySelector('.result__snippet, .result-snippet')?.textContent?.trim()
    if (!link || !link.textContent?.trim()) return

    const href = link.getAttribute('href') || ''
    const url = extractRealURL(href)

    results.push({
      titolo: link.textContent.trim(),
      url: url || href,
      snippet: snippet || '',
      fonte: url ? new URL(url).hostname.replace('www.', '') : 'DuckDuckGo',
    })
  })

  return results.slice(0, limit)
}

function extractRealURL(ddgHref: string): string {
  if (ddgHref.includes('uddg=')) {
    try {
      const params = new URLSearchParams(ddgHref.split('?')[1] || ddgHref)
      return decodeURIComponent(params.get('uddg') || '')
    } catch {
      return ddgHref
    }
  }
  return ddgHref
}

// Combina RAG news + web search in un contesto testuale per il system prompt
export function formatContextForPrompt(
  newsResults: { titolo: string; fonte: string; contenuto: string; url: string; data_pubblicazione: string | null }[],
  webResults: SearchResult[]
): string {
  const parts: string[] = []

  if (newsResults.length > 0) {
    parts.push('=== AGGIORNAMENTI NORMATIVI RECENTI (da fonti fiscali italiane) ===')
    newsResults.forEach((n, i) => {
      parts.push(
        `[${i + 1}] ${n.titolo} — Fonte: ${n.fonte}${n.data_pubblicazione ? ` (${n.data_pubblicazione})` : ''}\n    ${n.contenuto}\n    URL: ${n.url}`
      )
    })
  }

  if (webResults.length > 0) {
    parts.push('\n=== RISULTATI WEB IN TEMPO REALE ===')
    webResults.forEach((w, i) => {
      parts.push(
        `[${i + 1}] ${w.titolo} — ${w.fonte}\n    ${w.snippet}\n    URL: ${w.url}`
      )
    })
  }

  return parts.length > 0
    ? parts.join('\n\n') + '\n\nUsa queste informazioni come contesto aggiornato. Se contraddicono i tuoi parametri di base, cita la fonte e indica quale e piu recente.'
    : ''
}
