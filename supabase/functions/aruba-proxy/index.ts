// Edge Function: proxy verso le API Aruba Fatturazione Elettronica.
// Risolve il CORS: il browser chiama questa funzione, la funzione chiama Aruba.
// Le credenziali Aruba arrivano dal frontend nel body (restano nel progetto Supabase dell'utente).

import { corsHeaders, toBase64 } from '../_shared/cors.ts'

interface Credentials {
  username: string
  password: string
  authUrl: string
  apiUrl: string
}

async function getToken(c: Credentials): Promise<string> {
  const res = await fetch(`${c.authUrl}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      username: c.username,
      password: c.password,
    }),
  })
  if (!res.ok) throw new Error(`Autenticazione Aruba fallita (HTTP ${res.status})`)
  const data = await res.json()
  const token = data.accessToken || data.access_token
  if (!token) throw new Error('Token non presente nella risposta Aruba')
  return token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const { action, credentials, payload = {} } = await req.json()
    if (!credentials?.username || !credentials?.password) {
      return json({ ok: false, errore: 'Credenziali Aruba mancanti' })
    }
    const token = await getToken(credentials as Credentials)

    switch (action) {
      case 'test':
        return json({ ok: true })

      case 'send': {
        const res = await fetch(`${credentials.apiUrl}/services/invoice/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dataFile: toBase64(payload.xml) }),
        })
        if (!res.ok) {
          const txt = await res.text()
          return json({ ok: false, errore: `HTTP ${res.status}: ${txt.slice(0, 300)}` })
        }
        const d = await res.json()
        return json({ ok: true, sdiId: d.uploadFileName || d.id || payload.filename })
      }

      case 'status': {
        const res = await fetch(
          `${credentials.apiUrl}/services/invoice/out/getByFilename?filename=${encodeURIComponent(payload.sdiId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const d = await res.json()
        return json({ stato: d.status || d.statusDescription || 'sconosciuto' })
      }

      case 'receive': {
        const res = await fetch(
          `${credentials.apiUrl}/services/invoice/in/findByUsername?startDate=${encodeURIComponent(payload.since)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const d = await res.json()
        return json({ content: d.content || [] })
      }

      default:
        return json({ ok: false, errore: `Azione non riconosciuta: ${action}` })
    }
  } catch (e) {
    return json({ ok: false, errore: e instanceof Error ? e.message : 'errore sconosciuto' })
  }
})
