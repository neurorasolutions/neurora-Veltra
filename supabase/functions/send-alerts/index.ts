// Edge Function: alert scadenze fiscali via email (Resend).
// Chiamata da n8n su schedule (cron giornaliero) o manualmente.
// Legge le scadenze imminenti da veltra_scadenze (RLS permissiva: anon può leggere)
// e invia un'email tramite Resend. Le credenziali arrivano nel body (mai hardcoded).
//
// Deploy:
//   supabase functions deploy send-alerts
// Chiamata (n8n → HTTP Request):
//   POST https://TUA-PROGETTO.supabase.co/functions/v1/send-alerts
//   Headers: apikey + Authorization Bearer (anon key), Content-Type application/json
//   Body: { resendApiKey, destinatario, giorniAnticipo, from }

import { corsHeaders } from '../_shared/cors.ts'

interface Scadenza {
  id: string
  tipo: string
  data: string
  descrizione: string
  importo_stimato: number | null
  stato: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    return json({ ok: false, errore: 'SUPABASE_URL/ANON_KEY non configurate nella Edge Function' }, 500)
  }

  try {
    const { resendApiKey, destinatario, giorniAnticipo = 7, from } = await req.json()
    if (!resendApiKey || !destinatario) {
      return json({ ok: false, errore: 'resendApiKey e destinatario sono obbligatori' }, 400)
    }

    const oggi = new Date().toISOString().slice(0, 10)
    const limite = new Date(Date.now() + giorniAnticipo * 86400000).toISOString().slice(0, 10)

    // Query scadenze: non completate, con data tra oggi e oggi+giorniAnticipo
    const qs = new URLSearchParams({
      select: '*',
      stato: 'neq.completata',
      data: `gte.${oggi}`,
      order: 'data.asc',
    })
    // PostgREST non accetta due filtri sullo stesso campo via URLSearchParams con
    // chiavi duplicate, quindi aggiungiamo data=lte. manualmente.
    const url = `${supabaseUrl}/rest/v1/veltra_scadenze?${qs.toString()}&data=lte.${limite}`
    const scadenzeRes = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    })
    if (!scadenzeRes.ok) {
      return json({ ok: false, errore: `Query scadenze HTTP ${scadenzeRes.status}: ${(await scadenzeRes.text()).slice(0, 200)}` }, 500)
    }
    const scadenze = (await scadenzeRes.json()) as Scadenza[]

    if (scadenze.length === 0) {
      return json({ ok: true, inviate: 0, messaggio: 'Nessuna scadenza imminente nel periodo.' })
    }

    const righe = scadenze
      .map((s) => `• ${s.data} — ${s.descrizione}${s.importo_stimato ? ` (€ ${Number(s.importo_stimato).toFixed(2)})` : ''}`)
      .join('\n')

    const oggetto = `Scadenze fiscali in arrivo (${scadenze.length})`
    const testo = `Ciao,\n\nqueste sono le scadenze fiscali dei prossimi ${giorniAnticipo} giorni:\n\n${righe}\n\n— Neurora Fiscale`

    // Invio email via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'Neurora Fiscale <onboarding@resend.dev>',
        to: [destinatario],
        subject: oggetto,
        text: testo,
      }),
    })
    if (!resendRes.ok) {
      return json({ ok: false, errore: `Resend HTTP ${resendRes.status}: ${(await resendRes.text()).slice(0, 300)}` }, 500)
    }

    // Log in veltra_alert_log
    await fetch(`${supabaseUrl}/rest/v1/veltra_alert_log`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        tipo: 'scadenze',
        messaggio: oggetto,
        canale: 'email',
      }),
    }).catch(() => {})

    return json({
      ok: true,
      inviate: 1,
      destinatario,
      numeroScadenze: scadenze.length,
      periodo: `${oggi} → ${limite}`,
      scadenze,
    })
  } catch (e) {
    return json({ ok: false, errore: e instanceof Error ? e.message : 'errore sconosciuto' }, 500)
  }
})
