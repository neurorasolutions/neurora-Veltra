// Edge Function: sync automatico Fatture in Cloud → Supabase.
// Eseguita su schedule (cron settimanale) con il service role: legge le credenziali
// FiC da veltra_impostazioni, scarica clienti + fatture emesse + note di credito +
// fatture ricevute, e le inserisce con dedup (non duplica i record già presenti).
//
// Richiede: migrazione 005 (tabella veltra_impostazioni) applicata.

import { corsHeaders } from '../_shared/cors.ts'

const BASE = 'https://api-v2.fattureincloud.it'
const BOLLO_SOGLIA = 77.47

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function num(v: unknown): number {
  return Number(v ?? 0)
}

function entityName(d: Record<string, unknown>): string {
  const e = (d.entity || d.supplier) as { name?: string } | undefined
  return e?.name || ''
}

async function ficGet(path: string, accessToken: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  let page = 1
  const sep = path.includes('?') ? '&' : '?'
  while (true) {
    const r = await fetch(`${BASE}${path}${sep}page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!r.ok) throw new Error(`FiC HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
    const d = (await r.json()) as { data?: Record<string, unknown>[] }
    for (const item of d.data || []) out.push(item)
    if (!d.data || d.data.length < 100) break
    page++
  }
  return out
}

// Legge tutti i record di una tabella per un tenant (senza paginazione esplicita,
// sufficiente per il volume single-tenant).
async function supabaseRows(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  tenantId: string,
  select: string
): Promise<Record<string, unknown>[]> {
  const r = await fetch(
    `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&tenant_id=eq.${encodeURIComponent(tenantId)}`,
    {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }
  )
  if (!r.ok) throw new Error(`Supabase ${table} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return (await r.json()) as Record<string, unknown>[]
}

async function supabaseInsert(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  if (rows.length === 0) return
  const r = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!r.ok) throw new Error(`Supabase insert ${table} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
}

async function syncTenant(
  supabaseUrl: string,
  serviceKey: string,
  tenantId: string,
  accessToken: string,
  companyId: string,
  atecoDefault: string
) {
  // 1. Scarica da FiC
  const [clientiFiC, fattureFiC, noteCreditoEmesse, fattureRicevute, noteCreditoRicevute] = await Promise.all([
    ficGet(`/c/${companyId}/entities/clients`, accessToken).catch(() => [] as Record<string, unknown>[]),
    ficGet(`/c/${companyId}/issued_documents?type=invoice`, accessToken).catch(() => [] as Record<string, unknown>[]),
    ficGet(`/c/${companyId}/issued_documents?type=credit_note`, accessToken).catch(() => [] as Record<string, unknown>[]),
    ficGet(`/c/${companyId}/received_documents?type=expense`, accessToken).catch(() => [] as Record<string, unknown>[]),
    ficGet(`/c/${companyId}/received_documents?type=passive_credit_note`, accessToken).catch(() => [] as Record<string, unknown>[]),
  ])

  // 2. Leggi i record esistenti per dedup
  const clientiEsistenti = await supabaseRows(supabaseUrl, serviceKey, 'veltra_clienti', tenantId, 'piva,denominazione')
  const pivaSet = new Set(clientiEsistenti.map((c) => String(c.piva || '').toLowerCase()).filter(Boolean))
  const denomSet = new Set(clientiEsistenti.map((c) => String(c.denominazione || '').toLowerCase()).filter(Boolean))

  const fattureEsistenti = await supabaseRows(supabaseUrl, serviceKey, 'veltra_fatture', tenantId, 'numero,data,tipo')
  const fatturaSet = new Set(
    fattureEsistenti.map((f) => `${String(f.numero || '')}|${String(f.data || '').slice(0, 4)}|${String(f.tipo || '')}`)
  )

  // 3. Prepara i nuovi record
  const nuoviClienti: Record<string, unknown>[] = []
  for (const c of clientiFiC) {
    const denominazione = String(c.name || '')
    const piva = String(c.vat_number || '')
    if (piva && pivaSet.has(piva.toLowerCase())) continue
    if (denominazione && denomSet.has(denominazione.toLowerCase())) continue
    nuoviClienti.push({
      tenant_id: tenantId,
      denominazione,
      piva,
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

  const nuoveFatture: Record<string, unknown>[] = []
  const pushFattura = (d: Record<string, unknown>, tipo: string, segno: 1 | -1, descrizione: string) => {
    const numero = String(d.number ?? '')
    const data = String(d.date || '')
    const importo = num(d.amount_net ?? d.amount_gross) * segno
    if (fatturaSet.has(`${numero}|${data.slice(0, 4)}|${tipo}`)) return
    nuoveFatture.push({
      tenant_id: tenantId,
      numero,
      data: data || null,
      tipo,
      cliente_denominazione: entityName(d),
      importo,
      descrizione,
      ateco_codice: tipo === 'attiva' ? atecoDefault : '',
      bollo: tipo === 'attiva' && segno > 0 ? importo > BOLLO_SOGLIA : false,
      stato_sdi: tipo === 'attiva' ? 'consegnata' : 'ricevuta',
    })
  }
  for (const d of fattureFiC) pushFattura(d, 'attiva', 1, d.subject ? String(d.subject) : 'Importata da Fatture in Cloud')
  for (const d of noteCreditoEmesse) pushFattura(d, 'attiva', -1, `Nota di credito emessa — ${d.subject || 'Importata da Fatture in Cloud'}`)
  for (const d of fattureRicevute) pushFattura(d, 'passiva', 1, d.description ? String(d.description) : 'Fattura ricevuta')
  for (const d of noteCreditoRicevute) pushFattura(d, 'passiva', -1, 'Nota di credito ricevuta')

  // 4. Inserisci
  await supabaseInsert(supabaseUrl, serviceKey, 'veltra_clienti', nuoviClienti)
  await supabaseInsert(supabaseUrl, serviceKey, 'veltra_fatture', nuoveFatture)

  return { clienti: nuoviClienti.length, fatture: nuoveFatture.length }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ errore: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY non configurate' }, 500)
  }

  try {
    const settRes = await fetch(`${supabaseUrl}/rest/v1/veltra_impostazioni?select=tenant_id,chiave,valore`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (!settRes.ok) {
      return json({ errore: `Impostazioni HTTP ${settRes.status}: ${(await settRes.text()).slice(0, 200)}` }, 500)
    }
    const settings = (await settRes.json()) as { tenant_id: string; chiave: string; valore: string | null }[]

    const perTenant = new Map<string, { accessToken?: string; companyId?: string }>()
    for (const s of settings) {
      if (!perTenant.has(s.tenant_id)) perTenant.set(s.tenant_id, {})
      const t = perTenant.get(s.tenant_id)!
      if (s.chiave === 'fic_access_token') t.accessToken = s.valore || ''
      if (s.chiave === 'fic_company_id') t.companyId = s.valore || ''
    }

    const summary: Record<string, unknown>[] = []
    for (const [tid, cred] of perTenant) {
      if (!cred.accessToken || !cred.companyId) continue
      try {
        const r = await syncTenant(supabaseUrl, serviceKey, tid, cred.accessToken, cred.companyId, '59.20.3')
        summary.push({ tenant_id: tid, ...r })
      } catch (e) {
        summary.push({ tenant_id: tid, errore: e instanceof Error ? e.message : 'errore' })
      }
    }

    return json({ ok: true, sync: summary })
  } catch (e) {
    return json({ errore: e instanceof Error ? e.message : 'errore sconosciuto' }, 500)
  }
})
