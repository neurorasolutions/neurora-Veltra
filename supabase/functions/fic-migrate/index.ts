// Edge Function: migrazione da Fatture in Cloud (clonazione, D-008).
// Legge clienti, fatture emesse, note di credito emesse, fatture ricevute e
// note di credito ricevute via API FiC lato server (niente CORS) e li restituisce
// al frontend, che li inserisce in Supabase con dedup.
//
// Stessa logica di src/services/fattureInCloud.ts (fallback CORS automatico).

import { corsHeaders } from '../_shared/cors.ts'

const BASE = 'https://api-v2.fattureincloud.it'
const BOLLO_SOGLIA = 77.47

async function ficGet(path: string, accessToken: string): Promise<unknown> {
  const r = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!r.ok) throw new Error(`FiC HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json()
}

async function paginate<T>(
  path: string,
  accessToken: string,
  mapper: (d: Record<string, unknown>) => T
): Promise<T[]> {
  const out: T[] = []
  let page = 1
  const sep = path.includes('?') ? '&' : '?'
  while (true) {
    const data = (await ficGet(`${path}${sep}page=${page}&per_page=100`, accessToken)) as {
      data?: Record<string, unknown>[]
    }
    for (const d of data.data || []) out.push(mapper(d))
    if (!data.data || data.data.length < 100) break
    page++
  }
  return out
}

function num(v: unknown): number {
  return Number(v ?? 0)
}

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
    const cid = companyId as string
    const token = accessToken as string

    // Clienti (paginati)
    const clienti = await paginate(`/c/${cid}/entities/clients`, token, (c) => ({
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
    const fatture = await paginate(`/c/${cid}/issued_documents?type=invoice`, token, (d) => {
      const importo = num(d.amount_net ?? d.amount_gross)
      return {
        numero: String(d.number ?? ''),
        data: d.date || '',
        tipo: 'attiva',
        cliente_denominazione: (d.entity as { name?: string } | undefined)?.name || '',
        importo,
        descrizione: d.subject || 'Importata da Fatture in Cloud',
        ateco_codice: atecoDefault,
        bollo: importo > BOLLO_SOGLIA,
        stato_sdi: 'consegnata',
      }
    })

    // Note di credito emesse (riducono i ricavi → importo negativo)
    const noteCreditoEmesse = await paginate(
      `/c/${cid}/issued_documents?type=credit_note`,
      token,
      (d) => {
        const importo = num(d.amount_net ?? d.amount_gross)
        return {
          numero: String(d.number ?? ''),
          data: d.date || '',
          tipo: 'attiva',
          cliente_denominazione: (d.entity as { name?: string } | undefined)?.name || '',
          importo: -importo,
          descrizione: `Nota di credito emessa — ${d.subject || 'Importata da Fatture in Cloud'}`,
          ateco_codice: atecoDefault,
          bollo: false,
          stato_sdi: 'consegnata',
        }
      }
    )

    // Fatture ricevute (passive — archivio)
    const fattureRicevute = await paginate(
      `/c/${cid}/received_documents?type=expense`,
      token,
      (d) => {
        const entity = (d.entity || d.supplier) as { name?: string } | undefined
        return {
          numero: String(d.number ?? ''),
          data: d.date || '',
          tipo: 'passiva',
          cliente_denominazione: entity?.name || '',
          importo: num(d.amount_net ?? d.amount_gross),
          descrizione: d.description || d.subject || 'Fattura ricevuta importata da Fatture in Cloud',
          ateco_codice: '',
          bollo: false,
          stato_sdi: 'ricevuta',
        }
      }
    )

    // Note di credito ricevute (riducono le passive → importo negativo)
    const noteCreditoRicevute = await paginate(
      `/c/${cid}/received_documents?type=passive_credit_note`,
      token,
      (d) => {
        const entity = (d.entity || d.supplier) as { name?: string } | undefined
        return {
          numero: String(d.number ?? ''),
          data: d.date || '',
          tipo: 'passiva',
          cliente_denominazione: entity?.name || '',
          importo: -num(d.amount_net ?? d.amount_gross),
          descrizione: 'Nota di credito ricevuta — importata da Fatture in Cloud',
          ateco_codice: '',
          bollo: false,
          stato_sdi: 'ricevuta',
        }
      }
    )

    return json({
      clienti,
      fatture: [...fatture, ...noteCreditoEmesse, ...fattureRicevute, ...noteCreditoRicevute],
    })
  } catch (e) {
    return json({ errore: e instanceof Error ? e.message : 'errore sconosciuto' }, 500)
  }
})
