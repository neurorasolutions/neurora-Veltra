// Migrazione one-time da Fatture in Cloud (E3/D-008: clonazione, FiC resta attivo).
// Richiede un access token OAuth2 e l'ID azienda, da inserire in Impostazioni.
// Token ottenibile da https://developers.fattureincloud.it (app personale).

import { Cliente, Fattura } from '../types'
import { loadSettings } from '../lib/settings'
import { bolloDovuto } from '../engine/bollo'

const BASE = 'https://api-v2.fattureincloud.it'

async function ficGet(path: string): Promise<any> {
  const s = loadSettings()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${s.fattureInCloud.accessToken}` },
  })
  if (!res.ok) throw new Error(`Fatture in Cloud HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

export interface RisultatoMigrazione {
  clienti: Partial<Cliente>[]
  fatture: Partial<Fattura>[]
}

export async function importaDaFattureInCloud(atecoDefault: string): Promise<RisultatoMigrazione> {
  const s = loadSettings()
  if (!s.fattureInCloud.accessToken || !s.fattureInCloud.companyId) {
    throw new Error('Configura access token e company ID di Fatture in Cloud in Impostazioni.')
  }
  const cid = s.fattureInCloud.companyId

  // Clienti (paginati)
  const clienti: Partial<Cliente>[] = []
  let page = 1
  while (true) {
    const data = await ficGet(`/c/${cid}/entities/clients?page=${page}&per_page=100`)
    for (const c of data.data || []) {
      clienti.push({
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
      })
    }
    if (!data.data || data.data.length < 100) break
    page++
  }

  // Fatture emesse (paginati)
  const fatture: Partial<Fattura>[] = []
  page = 1
  while (true) {
    const data = await ficGet(`/c/${cid}/issued_documents?type=invoice&page=${page}&per_page=100`)
    for (const d of data.data || []) {
      const importo = Number(d.amount_net ?? d.amount_gross ?? 0)
      fatture.push({
        numero: String(d.number ?? ''),
        data: d.date || '',
        tipo: 'attiva',
        cliente_denominazione: d.entity?.name || '',
        importo,
        descrizione: d.subject || 'Importata da Fatture in Cloud',
        ateco_codice: atecoDefault,
        bollo: bolloDovuto(importo),
        stato_sdi: 'consegnata',
      })
    }
    if (!data.data || data.data.length < 100) break
    page++
  }

  return { clienti, fatture }
}
