// Migrazione one-time da Fatture in Cloud (E3/D-008: clonazione, FiC resta attivo).
// Richiede un access token OAuth2 e l'ID azienda, da inserire in Impostazioni.
// Token ottenibile dalla web app FiC: Impostazioni → Applicazioni collegate.
//
// Cosa importa:
//   - Clienti (tutti, paginati)
//   - Fatture EMESSE (issued_documents type=invoice)        → tipo 'attiva'
//   - Note di credito EMESSE (issued_documents type=credit_note) → 'attiva' con importo negativo
//   - Fatture RICEVUTE (received_documents type=expense)     → tipo 'passiva'
//   - Note di credito RICEVUTE (received_documents type=passive_credit_note) → 'passiva' negativa
//
// Robusto: se un singolo tipo di documento manca di permesso (HTTP 403) la migrazione
// NON si blocca: importa il resto e riporta l'avviso in `avvisi`.
//
// Fallback CORS automatico: se la chiamata diretta dal browser fallisce per un
// errore di rete/CORS, la migrazione riprova attraverso la Supabase Edge Function
// `fic-migrate` (stessa logica, lato server).

import { Cliente, Fattura } from '../types'
import { loadSettings } from '../lib/settings'
import { bolloDovuto } from '../engine/bollo'

const BASE = 'https://api-v2.fattureincloud.it'

export interface RisultatoMigrazione {
  clienti: Partial<Cliente>[]
  fatture: Partial<Fattura>[]
  avvisi: string[]
}

function isTransportError(e: unknown): boolean {
  return e instanceof TypeError
}

function edgeUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  return base ? `${base.replace(/\/+$/, '')}/functions/v1/fic-migrate` : ''
}

function chiarisciErrore(label: string, e: unknown): string {
  const msg = e instanceof Error ? e.message : 'errore sconosciuto'
  if (msg.includes('403')) {
    return `${label}: permesso mancante (HTTP 403) — aggiungi lo scope di lettura in FiC → Impostazioni → Applicazioni collegate.`
  }
  return `${label}: ${msg}`
}

async function ficGet(path: string): Promise<any> {
  const s = loadSettings()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${s.fattureInCloud.accessToken}` },
  })
  if (!res.ok) throw new Error(`Fatture in Cloud HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

// Fetch paginato: scorre tutte le pagine finché non ne tornano meno di 100.
async function paginate<T>(path: string, mapper: (d: any) => T): Promise<T[]> {
  const out: T[] = []
  let page = 1
  const sep = path.includes('?') ? '&' : '?'
  while (true) {
    const data = await ficGet(`${path}${sep}page=${page}&per_page=100`)
    for (const d of data.data || []) out.push(mapper(d))
    if (!data.data || data.data.length < 100) break
    page++
  }
  return out
}

// Esegue una paginazione senza far fallire l'intera migrazione: in caso di errore
// restituisce lista vuota + messaggio, così i tipi di documento con permessi
// mancanti vengono saltati (e segnalati) invece di bloccare tutto.
async function tryPaginate<T>(
  label: string,
  path: string,
  mapper: (d: any) => T
): Promise<{ items: T[]; errore?: string }> {
  try {
    return { items: await paginate(path, mapper) }
  } catch (e) {
    return { items: [], errore: chiarisciErrore(label, e) }
  }
}

export async function importaDaFattureInCloud(atecoDefault: string): Promise<RisultatoMigrazione> {
  try {
    return await importaDiretto(atecoDefault)
  } catch (e) {
    if (isTransportError(e) && edgeUrl()) {
      return await importaViaEdge(atecoDefault)
    }
    throw e
  }
}

async function importaDiretto(atecoDefault: string): Promise<RisultatoMigrazione> {
  const s = loadSettings()
  if (!s.fattureInCloud.accessToken || !s.fattureInCloud.companyId) {
    throw new Error('Configura access token e company ID di Fatture in Cloud in Impostazioni.')
  }
  const cid = s.fattureInCloud.companyId
  const avvisi: string[] = []

  const clientiRes = await tryPaginate<Partial<Cliente>>('Clienti', `/c/${cid}/entities/clients`, (c) => ({
    denominazione: c.name || '',
    piva: c.vat_number || '',
    cf: c.tax_code || '',
    codice_destinatario: c.ei_code || '',
    pec_destinatario: c.certified_email || '',
    indirizzo: c.address_street || '',
    comune: c.address_city || '',
    provincia: c.address_province || '',
    cap: c.address_postal_code || '',
    paese: 'IT',
  }))
  if (clientiRes.errore) avvisi.push(clientiRes.errore)

  const fattureRes = await tryPaginate<Partial<Fattura>>('Fatture emesse', `/c/${cid}/issued_documents?type=invoice`, (d) => {
    const importo = Number(d.amount_net ?? d.amount_gross ?? 0)
    return {
      numero: String(d.number ?? ''),
      data: d.date || '',
      tipo: 'attiva',
      cliente_denominazione: d.entity?.name || '',
      importo,
      descrizione: d.subject || 'Importata da Fatture in Cloud',
      ateco_codice: atecoDefault,
      bollo: bolloDovuto(importo),
      stato_sdi: 'consegnata',
    }
  })
  if (fattureRes.errore) avvisi.push(fattureRes.errore)

  const noteCreditoEmesseRes = await tryPaginate<Partial<Fattura>>(
    'Note di credito emesse',
    `/c/${cid}/issued_documents?type=credit_note`,
    (d) => {
      const importo = Number(d.amount_net ?? d.amount_gross ?? 0)
      return {
        numero: String(d.number ?? ''),
        data: d.date || '',
        tipo: 'attiva',
        cliente_denominazione: d.entity?.name || '',
        importo: -importo,
        descrizione: `Nota di credito emessa — ${d.subject || 'Importata da Fatture in Cloud'}`,
        ateco_codice: atecoDefault,
        bollo: false,
        stato_sdi: 'consegnata',
      }
    }
  )
  if (noteCreditoEmesseRes.errore) avvisi.push(noteCreditoEmesseRes.errore)

  const fattureRicevuteRes = await tryPaginate<Partial<Fattura>>(
    'Fatture ricevute',
    `/c/${cid}/received_documents?type=expense`,
    (d) => {
      const importo = Number(d.amount_net ?? d.amount_gross ?? 0)
      const fornitore = (d.entity || d.supplier) as { name?: string } | undefined
      return {
        numero: String(d.number ?? ''),
        data: d.date || '',
        tipo: 'passiva',
        cliente_denominazione: fornitore?.name || '',
        importo,
        descrizione: d.description || d.subject || 'Fattura ricevuta importata da Fatture in Cloud',
        ateco_codice: '',
        bollo: false,
        stato_sdi: 'ricevuta',
      }
    }
  )
  if (fattureRicevuteRes.errore) avvisi.push(fattureRicevuteRes.errore)

  const noteCreditoRicevuteRes = await tryPaginate<Partial<Fattura>>(
    'Note di credito ricevute',
    `/c/${cid}/received_documents?type=passive_credit_note`,
    (d) => {
      const importo = Number(d.amount_net ?? d.amount_gross ?? 0)
      const fornitore = (d.entity || d.supplier) as { name?: string } | undefined
      return {
        numero: String(d.number ?? ''),
        data: d.date || '',
        tipo: 'passiva',
        cliente_denominazione: fornitore?.name || '',
        importo: -importo,
        descrizione: 'Nota di credito ricevuta — importata da Fatture in Cloud',
        ateco_codice: '',
        bollo: false,
        stato_sdi: 'ricevuta',
      }
    }
  )
  if (noteCreditoRicevuteRes.errore) avvisi.push(noteCreditoRicevuteRes.errore)

  return {
    clienti: clientiRes.items,
    fatture: [
      ...fattureRes.items,
      ...noteCreditoEmesseRes.items,
      ...fattureRicevuteRes.items,
      ...noteCreditoRicevuteRes.items,
    ],
    avvisi,
  }
}

async function importaViaEdge(atecoDefault: string): Promise<RisultatoMigrazione> {
  const s = loadSettings()
  if (!s.fattureInCloud.accessToken || !s.fattureInCloud.companyId) {
    throw new Error('Configura access token e company ID di Fatture in Cloud in Impostazioni.')
  }
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (anon) {
    headers.Authorization = `Bearer ${anon}`
    headers.apikey = anon
  }
  const res = await fetch(edgeUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      accessToken: s.fattureInCloud.accessToken,
      companyId: s.fattureInCloud.companyId,
      atecoDefault,
    }),
  })
  if (!res.ok) {
    throw new Error(`Edge Function fic-migrate HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const data = await res.json()
  if (data.errore) throw new Error(data.errore)
  return {
    clienti: data.clienti || [],
    fatture: data.fatture || [],
    avvisi: data.avvisi || [],
  }
}
