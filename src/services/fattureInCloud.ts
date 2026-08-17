// Migrazione one-time da Fatture in Cloud (E3/D-008: clonazione, FiC resta attivo).
// Richiede un access token OAuth2 e l'ID azienda, da inserire in Impostazioni.
// Token ottenibile da https://developers.fattureincloud.it (app personale).
//
// Cosa importa:
//   - Clienti (tutti, paginati)
//   - Fatture EMESSE (issued_documents type=invoice)        → tipo 'attiva'
//   - Note di credito EMESSE (issued_documents type=credit_note) → 'attiva' con importo negativo
//   - Fatture RICEVUTE (received_documents type=expense)     → tipo 'passiva'
//   - Note di credito RICEVUTE (received_documents type=passive_credit_note) → 'passiva' negativa
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
}

function isTransportError(e: unknown): boolean {
  return e instanceof TypeError
}

function edgeUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  return base ? `${base.replace(/\/+$/, '')}/functions/v1/fic-migrate` : ''
}

async function ficGet(path: string): Promise<any> {
  const s = loadSettings()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${s.fattureInCloud.accessToken}` },
  })
  if (!res.ok) throw new Error(`Fatture in Cloud HTTP ${res.status}: ${await res.text()}`)
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

  const clienti = await paginate<Partial<Cliente>>(`/c/${cid}/entities/clients`, (c) => ({
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

  // Fatture emesse (attive)
  const fatture = await paginate<Partial<Fattura>>(`/c/${cid}/issued_documents?type=invoice`, (d) => {
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

  // Note di credito emesse (riducono i ricavi → importo negativo)
  const noteCreditoEmesse = await paginate<Partial<Fattura>>(
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

  // Fatture ricevute (passive — solo archivio, nel forfettario non deducibili)
  const fattureRicevute = await paginate<Partial<Fattura>>(
    `/c/${cid}/received_documents?type=expense`,
    (d) => {
      const importo = Number(d.amount_net ?? d.amount_gross ?? 0)
      return {
        numero: String(d.number ?? ''),
        data: d.date || '',
        tipo: 'passiva',
        cliente_denominazione: d.entity?.name || d.supplier?.name || '',
        importo,
        descrizione: d.description || d.subject || 'Fattura ricevuta importata da Fatture in Cloud',
        ateco_codice: '',
        bollo: false,
        stato_sdi: 'ricevuta',
      }
    }
  )

  // Note di credito ricevute (riducono le passive → importo negativo)
  const noteCreditoRicevute = await paginate<Partial<Fattura>>(
    `/c/${cid}/received_documents?type=passive_credit_note`,
    (d) => {
      const importo = Number(d.amount_net ?? d.amount_gross ?? 0)
      return {
        numero: String(d.number ?? ''),
        data: d.date || '',
        tipo: 'passiva',
        cliente_denominazione: d.entity?.name || d.supplier?.name || '',
        importo: -importo,
        descrizione: 'Nota di credito ricevuta — importata da Fatture in Cloud',
        ateco_codice: '',
        bollo: false,
        stato_sdi: 'ricevuta',
      }
    }
  )

  return {
    clienti,
    fatture: [...fatture, ...noteCreditoEmesse, ...fattureRicevute, ...noteCreditoRicevute],
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
  return { clienti: data.clienti || [], fatture: data.fatture || [] }
}
