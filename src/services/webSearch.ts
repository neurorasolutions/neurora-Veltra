// Web search per il commercialista AI: cerca informazioni fiscali in tempo reale
// usando DuckDuckGo (via Vite proxy in dev, allorigins in prod).
// I risultati vengono iniettati nel contesto del system prompt.

export interface SearchResult {
  titolo: string
  url: string
  snippet: string
  fonte: string
}

// Cerca su DuckDuckGo risultati web rilevanti per una query fiscale.
// Usa allorigins come CORS proxy (funziona in browser senza configurazione).
export async function webSearch(query: string, limit = 5): Promise<SearchResult[]> {
  // Aggiungi contesto fiscale italiano alla query
  const enhancedQuery = `${query} fiscalita Italia 2026`

  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(enhancedQuery)}`
  )}`

  const res = await fetch(proxyUrl)
  if (!res.ok) throw new Error(`Web search fallita (HTTP ${res.status})`)
  const html = await res.text()

  return parseDDGResults(html, limit)
}

function parseDDGResults(html: string, limit: number): SearchResult[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const results: SearchResult[] = []

  // DuckDuckGo HTML results: .result blocks with .result__a (title+link) and .result__snippet
  const resultBlocks = doc.querySelectorAll('.result, .web-result')
  resultBlocks.forEach((block) => {
    if (results.length >= limit) return
    const link = block.querySelector('.result__a, .result-link') as HTMLAnchorElement | null
    const snippet = block.querySelector('.result__snippet, .result-snippet')?.textContent?.trim()
    if (!link || !link.textContent?.trim()) return

    // DDG wraps links in a redirect; estrai l'URL reale
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
  // DDG links: /l/?uddg=ENCODED_URL&rut=...
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
