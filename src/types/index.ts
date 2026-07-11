export interface AtecoConfig {
  codice: string
  descrizione: string
  coeff: number
  prevalente: boolean
}

export interface ProfiloFiscale {
  id: string
  denominazione: string
  piva: string
  cf: string
  indirizzo: string
  comune: string
  provincia: string
  cap: string
  pec: string
  rea: string
  regime: 'forfettario'
  ateco_codici: AtecoConfig[]
  aliquota_sostitutiva: number // 0.15 o 0.05
  aliquota_inps: number // 0.2607
  gestione_inps: 'separata' | 'artigiani' | 'commercianti' | 'cassa'
  data_apertura_piva: string
  created_at?: string
}

export interface Cliente {
  id: string
  denominazione: string
  piva: string
  cf: string
  codice_destinatario: string // SDI, 7 char ('0000000' se assente)
  pec_destinatario: string
  indirizzo: string
  comune: string
  provincia: string
  cap: string
  paese: string
  created_at?: string
}

export type StatoSDI = 'bozza' | 'inviata' | 'consegnata' | 'scartata' | 'ricevuta'

export interface Fattura {
  id: string
  numero: string
  data: string // ISO date
  tipo: 'attiva' | 'passiva'
  cliente_id: string
  cliente_denominazione: string
  importo: number // forfettario: totale = imponibile, no IVA
  descrizione: string
  ateco_codice: string
  bollo: boolean // true se importo > 77,47 €
  stato_sdi: StatoSDI
  sdi_identificativo?: string
  xml?: string
  created_at?: string
}

export interface RigaF24 {
  sezione: 'erario' | 'inps'
  codice: string // codice tributo (erario) o causale (inps)
  anno: string
  importo: number
  descrizione: string
}

export type TipoF24 = 'saldo_acconto1' | 'acconto2' | 'bollo'

export interface F24Doc {
  id: string
  anno_riferimento: number
  tipo: TipoF24
  data_scadenza: string
  righe: RigaF24[]
  totale: number
  stato: 'bozza' | 'pronto' | 'pagato'
  created_at?: string
}

export interface Scadenza {
  id: string
  tipo: string
  data: string
  descrizione: string
  importo_stimato: number | null
  stato: 'pendente' | 'notificata' | 'completata'
  created_at?: string
}

export interface Dichiarazione {
  id: string
  anno_imposta: number
  stato: 'bozza' | 'precompilata' | 'pronta' | 'inviata_manualmente'
  quadro_lm: Record<string, number | string>
  note: string
  created_at?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}
