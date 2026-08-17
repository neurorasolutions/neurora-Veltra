// Edge Function: migrazione da Fatture in Cloud (clonazione, D-008).
// Legge clienti, fatture emesse, note di credito emesse, fatture ricevute e
// note di credito ricevute via API FiC lato server (niente CORS) e li restituisce
// al frontend, che li inserisce in Supabase con dedup.
//
// Robusto: se un singolo tipo di documento manca di permesso (HTTP 403) non blocca
// la migrazione: importa il resto e riporta l'avviso in `avvisi`.
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

async function tryPaginate<T>(
  label: string,
  path: string,
  accessToken: string,
  mapper: (d: Record<string, unknown>) => T
): Promise<{ items: T[]; errore?: string }> {
  try {
    return { items: await paginate(path, accessToken, mapper) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    const chiaro = msg.includes('403')
      ? `${label}: permesso mancante (HTTP 403) — aggiungi lo scope di lettura in FiC → Impostazioni → Applicazioni collegate.`
      : `${label}: ${msg}`
    return { items: [], errore: chiaro }
  }
}

function num(v: unknown): number {
  return Number(v ?? 0)
}

function entityName(d: Record<string, unknown>): string {
  const e = (d.entity || d.supplier) as { name?: string } | undefined
  return e?.name || ''
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
    const avvisi: string[] = []

    const clientiRes = await tryPaginate('Clienti', `/c/${cid}/entities/clients`, token, (c) => ({
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

    const fattureRes = await tryPaginate('Fatture emesse', `/c/${cid}/issued_documents?type=invoice`, token, (d) => {
      const importo = num(d.amount_net ?? d.amount_gross)
      return {
        numero: String(d.number ?? ''),
        data: d.date || '',
        tipo: 'attiva',
        cliente_denominazione: entityName(d),
        importo,
        descrizione: d.subject || 'Importata da Fatture in Cloud',
        ateco_codice: atecoDefault,
        bollo: importo > BOLLO_SOGLIA,
        stato_sdi: 'consegnata',
      }
    })
    if (fattureRes.errore) avvisi.push(fattureRes.errore)

    const noteCreditoEmesseRes = await tryPaginate(
      'Note di credito emesse',
      `/c/${cid}/issued_documents?type=credit_note`,
      token,
      (d) => {
        const importo = num(d.amount_net ?? d.amount_gross)
        return {
          numero: String(d.number ?? ''),
          data: d.date || '',
          tipo: 'attiva',
          cliente_denominazione: entityName(d),
          importo: -importo,
          descrizione: `Nota di credito emessa — ${d.subject || 'Importata da Fatture in Cloud'}`,
          ateco_codice: atecoDefault,
          bollo: false,
          stato_sdi: 'consegnata',
        }
      }
    )
    if (noteCreditoEmesseRes.errore) avvisi.push(noteCreditoEmesseRes.errore)

    const fattureRicevuteRes = await tryPaginate(
      'Fatture ricevute',
      `/c/${cid}/received_documents?type=expense`,
      token,
      (d) => ({
        numero: String(d.number ?? ''),
        data: d.date || '',
        tipo: 'passiva',
        cliente_denominazione: entityName(d),
        importo: num(d.amount_net ?? d.amount_gross),
        descrizione: d.description || d.subject || 'Fattura ricevuta importata da Fatture in Cloud',
        ateco_codice: '',
        bollo: false,
        stato_sdi: 'ricevuta',
      })
    )
    if (fattureRicevuteRes.errore) avvisi.push(fattureRicevuteRes.errore)

    const noteCreditoRicevuteRes = await tryPaginate(
      'Note di credito ricevute',
      `/c/${cid}/received_documents?type=passive_credit_note`,
      token,
      (d) => ({
        numero: String(d.number ?? ''),
        data: d.date || '',
        tipo: 'passiva',
        cliente_denominazione: entityName(d),
        importo: -num(d.amount_net ?? d.amount_gross),
        descrizione: 'Nota di credito ricevuta — importata da Fatture in Cloud',
        ateco_codice: '',
        bollo: false,
        stato_sdi: 'ricevuta',
      })
    )
    if (noteCreditoRicevuteRes.errore) avvisi.push(noteCreditoRicevuteRes.errore)

    return json({
      clienti: clientiRes.items,
      fatture: [
        ...fattureRes.items,
        ...noteCreditoEmesseRes.items,
        ...fattureRicevuteRes.items,
        ...noteCreditoRicevuteRes.items,
      ],
      avvisi,
    })
  } catch (e) {
    return json({ errore: e instanceof Error ? e.message : 'errore sconosciuto' }, 500)
  }
})
