// RAG normativo: fetch di feed RSS da fonti fiscali italiane,
// storage in Supabase (veltra_news_fiscali), ricerca per keyword
// quando l'utente fa una domanda al commercialista AI.

import { supabase, getActiveTenantId } from '../lib/db'

// Fonti RSS fiscali italiane. Proxy CORS via allorigins (gratuito, browser-safe).
const CORS_PROXY = 'https://api.allorigins.win/raw?url='

export interface RSSSource {
  name: string
  url: string
  priority: number // 1 = massima
}

export const RSS_SOURCES: RSSSource[] = [
  { name: 'Agenzia delle Entrate', url: 'https://www.agenziaentrate.gov.it/portale/sala-stampa/rss', priority: 1 },
  { name: 'FiscoOggi', url: 'https://www.fiscooggi.it/rss', priority: 1 },
  { name: 'Eutekne', url: 'https://www.eutekne.com/feed/', priority: 2 },
  { name: 'Commercialista Telematico', url: 'https://www.commercialistatelematico.com/feed/', priority: 2 },
  { name: 'Italia Oggi Fisco', url: 'https://www.italiaoggi.it/rss/fisco.xml', priority: 2 },
]

export interface NewsFiscale {
  id: string
  fonte: string
  titolo: string
  url: string
  contenuto: string
  data_pubblicazione: string | null
  tags: string[]
  rilevante_forfettario: boolean
  created_at?: string
}

// Parole chiave che indicano rilevanza per il regime forfettario
const KEYWORDS_FORFETTARIO = [
  'forfettario', 'forfettari', 'regime forfettario', 'imposta sostitutiva',
  'coefficiente redditivita', 'soglia 85.000', 'soglia 65000', 'agevolazione 5%',
  '169 190', 'l. 190', 'quadro lm', 'isansa', 'acconto', 'ravvedimento',
  'f24', 'codice tributo', 'inal', 'gestione separata', 'contributi inps',
  'fatturazione elettronica', 'sdI', 'fattura pa', 'bollo virtuale',
  'iva', 'registro', 'dichiarazione redditi', 'modello redditi',
]

function extractTags(text: string): string[] {
  const lower = text.toLowerCase()
  return KEYWORDS_FORFETTARIO.filter((k) => lower.includes(k))
}

function isRilevanteForfettario(text: string): boolean {
  const lower = text.toLowerCase()
  return lower.includes('forfettar') || lower.includes('imposta sostitutiva') ||
    lower.includes('coefficiente') || lower.includes('190/2014') ||
    lower.includes('quadro lm')
}

function stripHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent?.trim() || ''
  } catch {
    return html.replace(/<[^>]*>/g, '').trim()
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text
}

// Parse RSS XML into articles
function parseRSS(xml: string, fonte: string): Omit<NewsFiscale, 'id' | 'created_at'>[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const items = doc.querySelectorAll('item, entry')
  const articles: Omit<NewsFiscale, 'id' | 'created_at'>[] = []

  items.forEach((item) => {
    const getTitle = (sel: string) => item.querySelector(sel)?.textContent?.trim() || ''
    const titolo = getTitle('title')
    if (!titolo) return

    const link = item.querySelector('link')?.textContent?.trim() ||
      item.querySelector('link')?.getAttribute('href') || ''
    const pubDate = item.querySelector('pubDate, published, updated')?.textContent?.trim() || ''
    const desc = item.querySelector('description, summary, content, content\\:encoded')?.textContent?.trim() || ''
    const contenuto = stripHtml(desc || titolo)

    const dataPubblicazione = pubDate ? parseDate(pubDate) : null
    const fullText = `${titolo} ${contenuto}`
    articles.push({
      fonte,
      titolo: truncate(titolo, 300),
      url: link,
      contenuto: truncate(contenuto, 1000),
      data_pubblicazione: dataPubblicazione,
      tags: extractTags(fullText),
      rilevante_forfettario: isRilevanteForfettario(fullText),
    })
  })

  return articles
}

function parseDate(dateStr: string): string | null {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

// Fetch di un singolo feed RSS via CORS proxy
async function fetchRSS(source: RSSSource): Promise<Omit<NewsFiscale, 'id' | 'created_at'>[]> {
  const url = `${CORS_PROXY}${encodeURIComponent(source.url)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${source.name}`)
  const xml = await res.text()
  return parseRSS(xml, source.name)
}

// Scarica tutti i feed e salva in Supabase. Ritorna statistiche.
export interface FetchResult {
  fonte: string
  articoli: number
  errore?: string
}

export async function fetchAllRSS(): Promise<FetchResult[]> {
  if (!supabase) throw new Error('Supabase non configurato. RAG richiede Supabase.')
  const tenantId = getActiveTenantId()
  const results: FetchResult[] = []

  for (const source of RSS_SOURCES) {
    try {
      const articles = await fetchRSS(source)
      // Dedup per URL: se l'URL esiste già, non reinserire
      const existingUrls = new Set<string>()
      if (articles.length > 0) {
        const { data: existing } = await supabase
          .from('veltra_news_fiscali')
          .select('url')
          .in('url', articles.map((a) => a.url).filter(Boolean))
        ;(existing || []).forEach((r: { url: string }) => existingUrls.add(r.url))
      }

      const nuovi = articles.filter((a) => a.url && !existingUrls.has(a.url))
      if (nuovi.length > 0) {
        const rows = nuovi.map((a) => ({
          ...a,
          tenant_id: tenantId,
          id: crypto.randomUUID(),
        }))
        const { error } = await supabase.from('veltra_news_fiscali').insert(rows)
        if (error) throw error
      }
      results.push({ fonte: source.name, articoli: nuovi.length })
    } catch (e) {
      results.push({ fonte: source.name, articoli: 0, errore: e instanceof Error ? e.message : 'errore' })
    }
  }
  return results
}

// Ricerca articoli rilevanti per la domanda dell'utente.
// Combina keyword matching + full-text search su Supabase.
export async function searchRelevantNews(domanda: string, limit = 5): Promise<NewsFiscale[]> {
  if (!supabase) return []

  const keywords = extractTags(domanda)
  const searchTerms = domanda
    .toLowerCase()
    .replace(/[?.,!;:()'"]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 10)

  // 1. Keyword match sui tag (più preciso)
  let keywordResults: NewsFiscale[] = []
  if (keywords.length > 0) {
    const { data } = await supabase
      .from('veltra_news_fiscali')
      .select('*')
      .or(keywords.map((k) => `tags.cs.{${JSON.stringify(k)}}`).join(','))
      .order('data_pubblicazione', { ascending: false })
      .limit(limit)
    keywordResults = (data || []) as NewsFiscale[]
  }

  // 2. Full-text search con termini generici
  let ftsResults: NewsFiscale[] = []
  if (searchTerms.length > 0) {
    const ftsQuery = searchTerms.join(' | ')
    const { data } = await supabase
      .from('veltra_news_fiscali')
      .select('*')
      .textSearch('contenuto', ftsQuery, { type: 'websearch' })
      .order('data_pubblicazione', { ascending: false })
      .limit(limit)
    ftsResults = (data || []) as NewsFiscale[]
  }

  // 3. Merge + dedup, priorita a keyword match
  const seen = new Set<string>()
  const merged: NewsFiscale[] = []
  for (const a of [...keywordResults, ...ftsResults]) {
    if (!seen.has(a.id)) {
      seen.add(a.id)
      merged.push(a)
    }
    if (merged.length >= limit) break
  }
  return merged
}

// Conta articoli in DB (per stato UI)
export async function countNews(): Promise<number> {
  if (!supabase) return 0
  const { count } = await supabase
    .from('veltra_news_fiscali')
    .select('*', { count: 'exact', head: true })
  return count || 0
}

// Ultimi articoli (per stato UI)
export async function recentNews(limit = 10): Promise<NewsFiscale[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('veltra_news_fiscali')
    .select('*')
    .order('data_pubblicazione', { ascending: false, nullsFirst: false })
    .limit(limit)
  return (data || []) as NewsFiscale[]
}
