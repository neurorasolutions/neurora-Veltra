// Provider SDI — interfaccia di astrazione (§8.3 fatturazione_elettronica.md)
// e implementazione Aruba (API v2, OAuth2, utenza Premium richiesta).
//
// NOTA CORS: le API Aruba potrebbero non essere chiamabili direttamente dal
// browser. In quel caso la strada canonica è una Supabase Edge Function che fa
// da proxy (stessa interfaccia). Il fallback sempre disponibile è
// "Scarica XML" + upload manuale sul pannello Aruba.

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

  async inviaFattura(xml: string, nomeFile: string): Promise<EsitoInvio> {
    try {
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
    } catch (e) {
      return {
        ok: false,
        errore:
          e instanceof Error
            ? `${e.message} — se è un errore di rete/CORS, usa "Scarica XML" e carica il file sul pannello Aruba, oppure configura il proxy Edge Function.`
            : 'Errore sconosciuto',
      }
    }
  }

  async getStatoFattura(sdiId: string): Promise<string> {
    const s = loadSettings()
    const token = await this.getToken()
    const res = await fetch(
      `${s.aruba.apiUrl}/services/invoice/out/getByFilename?filename=${encodeURIComponent(sdiId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.status || data.statusDescription || 'sconosciuto'
  }

  async riceviFatture(since: string): Promise<Partial<Fattura>[]> {
    const s = loadSettings()
    const token = await this.getToken()
    const res = await fetch(
      `${s.aruba.apiUrl}/services/invoice/in/findByUsername?startDate=${encodeURIComponent(since)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { content?: FatturaRicevutaAruba[] }
    const content = data.content || []
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
    await this.getToken()
  }
}

export const arubaProvider = new ArubaSDIProvider()
