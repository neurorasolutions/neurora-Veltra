// Edge Function: proxy AI (LLM + web search).
// Risolve i problemi di CORS: il browser chiama questa funzione, che a sua volta
// chiama il provider LLM (Ollama, Anthropic, OpenAI, Groq, OpenRouter) e
// DuckDuckGo lato server (dove il CORS non esiste).
//
// Azioni:
//   { action: 'chat', provider, apiKey, ollamaApiKey, apiUrl, model, messages, systemPrompt }
//   { action: 'search', query, limit }
//
// La chiave API è passata nel body dal frontend (resta nel progetto Supabase dell'utente,
// mai salvata lato server).

import { corsHeaders } from '../_shared/cors.ts'

const PROVIDER_BASE: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").trim()
}

function extractRealURL(href: string): string {
  if (href.includes('uddg=')) {
    try {
      const u = new URL(href, 'https://duckduckgo.com')
      return decodeURIComponent(u.searchParams.get('uddg') || '')
    } catch {
      return href
    }
  }
  return href.startsWith('//') ? 'https:' + href : href
}

function parseDDG(html: string, limit: number) {
  const results: { titolo: string; url: string; snippet: string; fonte: string }[] = []
  const linkRe = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  const snippetRe = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g

  const snippets: string[] = []
  let m: RegExpExecArray | null
  while ((m = snippetRe.exec(html)) && snippets.length < limit) {
    snippets.push(stripHtml(m[1]))
  }

  let i = 0
  while ((m = linkRe.exec(html)) && results.length < limit) {
    const url = extractRealURL(m[1])
    const titolo = stripHtml(m[2])
    if (!titolo || !url) continue
    let fonte = 'DuckDuckGo'
    try {
      fonte = new URL(url).hostname.replace('www.', '')
    } catch {
      /* keep default */
    }
    results.push({ titolo, url, snippet: snippets[i] || '', fonte })
    i++
  }
  return results
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()

    if (body.action === 'chat') {
      const { provider, apiKey, ollamaApiKey, apiUrl, model, messages, systemPrompt } = body
      const key = provider === 'ollama' ? (ollamaApiKey || apiKey) : apiKey
      if (!key) return json({ errore: 'Nessuna chiave API fornita' }, 400)

      // Anthropic ha un formato non OpenAI-compatible
      if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({ model, max_tokens: 1500, system: systemPrompt, messages }),
        })
        if (!res.ok) return json({ errore: `Anthropic HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` }, 500)
        const data = await res.json()
        return json({ content: data.content?.[0]?.text || '' })
      }

      // OpenAI-compatible: openai, groq, openrouter, ollama
      const base =
        provider === 'ollama'
          ? `${String(apiUrl || 'https://api.ollama.com').replace(/\/+$/, '')}/v1`
          : PROVIDER_BASE[provider] || PROVIDER_BASE.openrouter
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      }
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://neurora-veltra.vercel.app'
        headers['X-Title'] = 'VELTRA by Neurora'
      }
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: 1500,
        }),
      })
      if (!res.ok) return json({ errore: `${provider} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` }, 500)
      const data = await res.json()
      return json({ content: data.choices?.[0]?.message?.content || '' })
    }

    if (body.action === 'search') {
      const { query, limit = 5 } = body
      const enhanced = `${query} fiscalita Italia 2026`
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(enhanced)}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        },
      })
      if (!res.ok) return json({ errore: `DuckDuckGo HTTP ${res.status}` }, 500)
      const html = await res.text()
      return json({ results: parseDDG(html, limit) })
    }

    return json({ errore: `Azione non riconosciuta: ${body.action}` }, 400)
  } catch (e) {
    return json({ errore: e instanceof Error ? e.message : 'errore sconosciuto' }, 500)
  }
})
