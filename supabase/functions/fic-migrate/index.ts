// Edge Function: migrazione da Fatture in Cloud (clonazione, D-008).
// Legge clienti e fatture emesse via API FiC lato server (niente CORS) e li
// restituisce al frontend, che li inserisce in Supabase con dedup.

import { corsHeaders } from '../_shared/cors.ts'

const BASE = 'https://api-v2.fattureincloud.it'
const BOLLO_SOGLIA = 77.47

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const { accessToken, companyId, atecoDefault = '' } = await req.json()
    if (!accessToken || !companyId) {
      return json({ errore: 'accessToken e companyId sono richiesti' }, 400)
    }
    const auth = { Authorization: `Bearer ${accessToken}` }

    // Clienti (paginati)
    const clienti: unknown[] = []
    let page = 1
    while (true) {
      const r = await fetch(`${BASE}/c/${companyId}/entities/clients?page=${page}&per_page=100`, {
        headers: auth,
      })
      if (!r.ok) throw new Error(`FiC clienti HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const d = await r.json()
      for (const c of d.data || []) {
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
      if (!d.data || d.data.length < 100) break
      page++
    }

    // Fatture emesse (paginati)
    const fatture: unknown[] = []
    page = 1
    while (true) {
      const r = await fetch(
        `${BASE}/c/${companyId}/issued_documents?type=invoice&page=${page}&per_page=100`,
        { headers: auth }
      )
      if (!r.ok) throw new Error(`FiC fatture HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const d = await r.json()
      for (const doc of d.data || []) {
        const importo = Number(doc.amount_net ?? doc.amount_gross ?? 0)
        fatture.push({
          numero: String(doc.number ?? ''),
          data: doc.date || '',
          tipo: 'attiva',
          cliente_denominazione: doc.entity?.name || '',
          importo,
          descrizione: doc.subject || 'Importata da Fatture in Cloud',
          ateco_codice: atecoDefault,
          bollo: importo > BOLLO_SOGLIA,
          stato_sdi: 'consegnata',
        })
      }
      if (!d.data || d.data.length < 100) break
      page++
    }

    return json({ clienti, fatture })
  } catch (e) {
    return json({ errore: e instanceof Error ? e.message : 'errore sconosciuto' }, 500)
  }
})
