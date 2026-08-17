// Provider SDI — interfaccia di astrazione (§8.3 fatturazione_elettronica.md)
// e implementazione Aruba (API v2, OAuth2, utenza Premium richiesta).
//
// Fallback CORS automatico: se la chiamata diretta dal browser fallisce con un
// errore di rete/CORS (TypeError "Failed to fetch"), il provider riprova
// attraverso la Supabase Edge Function `aruba-proxy` (stessa interfaccia).
// L'URL del proxy è impostato manualmente in `aruba.proxyUrl` o, se vuoto,
// derivato da VITE_SUPABASE_URL.

import { Fattura } from '../types'
import { loadSettings } from '../lib/settings'

export interface EsitoInvio {
  ok: boolean
  sdiId?: string
  errore?: string
}

interface FatturaRicevutaAruba {
  invoiceNumber?: string
  number?: string
  invoiceDate?: string
  date?: string
  senderDescription?: string
  sender?: string
  totalAmount?: number
  amount?: number
  filename?: string
  id?: string
}

export interface SDIProvider {
  inviaFattura(xml: string, nomeFile: string): Promise<EsitoInvio>
  getStatoFattura(sdiId: string): Promise<string>
  riceviFatture(since: string): Promise<Partial<Fattura>[]>
  testConnection(): Promise<void>
}

function erroreMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Errore sconosciuto'
}

// Gli errori di rete/CORS in fetch si manifestano come TypeError.
function isTransportError(e: unknown): boolean {
  return e instanceof TypeError
}

function proxyUrl(): string {
  const s = loadSettings()
  if (s.aruba.proxyUrl) return s.aruba.proxyUrl
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  return base ? `${base.replace(/\/+$/, '')}/functions/v1/aruba-proxy` : ''
}

function proxyHeaders(): Record<string, string> {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (anon) {
    headers.Authorization = `Bearer ${anon}`
    headers.apikey = anon
  }
  return headers
}

export class ArubaSDIProvider implements SDIProvider {
  private token: string | null = null
  private tokenExpiry = 0

  private async getToken(): Promise<string> {
    const s = loadSettings()
    if (this.token && Date.now() < this.tokenExpiry) return this.token
    const res = await fetch(`${s.aruba.authUrl}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        username: s.aruba.username,
        password: s.aruba.password,
      }),
    })
    if (!res.ok) throw new Error(`Autenticazione Aruba fallita (HTTP ${res.status})`)
    const data = await res.json()
    this.token = data.accessToken || data.access_token
    // il token Aruba dura tipicamente 30 minuti; margine di sicurezza
    this.tokenExpiry = Date.now() + 25 * 60 * 1000
    if (!this.token) throw new Error('Token non presente nella risposta Aruba')
    return this.token
  }

  private async callProxy<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const url = proxyUrl()
    if (!url) {
      throw new Error(
        'Proxy Aruba non configurato: imposta VITE_SUPABASE_URL (e la Edge Function aruba-proxy) o il campo aruba.proxyUrl.'
      )
    }
    const s = loadSettings()
    const res = await fetch(url, {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify({
        action,
        credentials: {
          username: s.aruba.username,
          password: s.aruba.password,
          authUrl: s.aruba.authUrl,
          apiUrl: s.aruba.apiUrl,
        },
        payload,
      }),
    })
    if (!res.ok) {
      throw new Error(`Proxy Aruba HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
    }
    return (await res.json()) as T
  }

  private async inviaDiretto(xml: string, nomeFile: string): Promise<EsitoInvio> {
    const s = loadSettings()
    const token = await this.getToken()
    const dataFile = btoa(unescape(encodeURIComponent(xml)))
    const res = await fetch(`${s.aruba.apiUrl}/services/invoice/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ dataFile, credential: '', domain: '' }),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, errore: `HTTP ${res.status}: ${txt.slice(0, 300)}` }
    }
    const data = await res.json()
    return { ok: true, sdiId: data.uploadFileName || data.id || nomeFile }
  }

  async inviaFattura(xml: string, nomeFile: string): Promise<EsitoInvio> {
    try {
      return await this.inviaDiretto(xml, nomeFile)
    } catch (e) {
      if (isTransportError(e) && proxyUrl()) {
        const r = await this.callProxy<{ ok: boolean; sdiId?: string; errore?: string }>('send', {
          xml,
          filename: nomeFile,
        })
        return { ok: r.ok, sdiId: r.sdiId, errore: r.errore }
      }
      return {
        ok: false,
        errore:
          `${erroreMsg(e)} — se è un errore di rete/CORS, configura la Edge Function aruba-proxy` +
          ` (VITE_SUPABASE_URL) oppure usa "Scarica XML" e carica il file sul pannello Aruba.`,
      }
    }
  }

  async getStatoFattura(sdiId: string): Promise<string> {
    try {
      const s = loadSettings()
      const token = await this.getToken()
      const res = await fetch(
        `${s.aruba.apiUrl}/services/invoice/out/getByFilename?filename=${encodeURIComponent(sdiId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return data.status || data.statusDescription || 'sconosciuto'
    } catch (e) {
      if (isTransportError(e) && proxyUrl()) {
        const r = await this.callProxy<{ stato?: string }>('status', { sdiId })
        return r.stato || 'sconosciuto'
      }
      throw e
    }
  }

  async riceviFatture(since: string): Promise<Partial<Fattura>[]> {
    try {
      const s = loadSettings()
      const token = await this.getToken()
      const res = await fetch(
        `${s.aruba.apiUrl}/services/invoice/in/findByUsername?startDate=${encodeURIComponent(since)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { content?: FatturaRicevutaAruba[] }
      return this.mapRicevute(data.content || [])
    } catch (e) {
      if (isTransportError(e) && proxyUrl()) {
        const r = await this.callProxy<{ content?: FatturaRicevutaAruba[] }>('receive', { since })
        return this.mapRicevute(r.content || [])
      }
      throw e
    }
  }

  private mapRicevute(content: FatturaRicevutaAruba[]): Partial<Fattura>[] {
    return content.map((r) => ({
      tipo: 'passiva' as const,
      numero: r.invoiceNumber || r.number || '',
      data: (r.invoiceDate || r.date || '').slice(0, 10),
      cliente_denominazione: r.senderDescription || r.sender || 'Fornitore',
      importo: Number(r.totalAmount || r.amount || 0),
      descrizione: 'Fattura passiva ricevuta via SDI',
      stato_sdi: 'ricevuta' as const,
      sdi_identificativo: r.filename || r.id,
    }))
  }

  // Test connessione: richiede un token e lo scarta. Usato da Impostazioni.
  async testConnection(): Promise<void> {
    try {
      await this.getToken()
    } catch (e) {
      if (isTransportError(e) && proxyUrl()) {
        const r = await this.callProxy<{ ok: boolean; errore?: string }>('test')
        if (!r.ok) throw new Error(r.errore || 'Test Aruba fallito via proxy')
        return
      }
      throw e
    }
  }
}

export const arubaProvider = new ArubaSDIProvider()
