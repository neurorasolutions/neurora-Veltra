// Motore di calcolo previsione tasse — regime forfettario.
// Funzioni pure e deterministiche (D-005): l'AI non è mai fonte di verità numerica.

import { Fattura, ProfiloFiscale } from '../types'
import { param, coeffAteco } from './datiNormativi'

export interface BreakdownAteco {
  codice: string
  ricavi: number
  coeff: number
  redditoImponibile: number
}

export interface Previsione {
  anno: number
  ricaviTotali: number
  breakdown: BreakdownAteco[]
  redditoImponibile: number
  aliquotaInps: number
  contributiInpsStimati: number // maturati — stima previsionale (Nota 2 previsione_tasse.md)
  redditoNetto: number
  aliquotaSostitutiva: number
  impostaSostitutiva: number
  totaleDovutoStimato: number
  aliquotaEffettiva: number // su ricavi
  sogliaRicavi: number
  sogliaEsclusione: number
  residuoSoglia: number
  percentualeSoglia: number
  alertPreavviso: boolean // superati 75.000 €
  alertSoglia: boolean // superati 85.000 €
  alertEsclusione: boolean // superati 100.000 €
}

// L'agevolazione 5% vale per i primi 5 anni di attività.
export function aliquotaSostitutivaPerAnno(profilo: ProfiloFiscale, anno: number): number {
  const annoApertura = new Date(profilo.data_apertura_piva).getFullYear()
  const agevolata = anno - annoApertura < 5
  return agevolata ? param('imposta_sostitutiva_agevolata') : profilo.aliquota_sostitutiva
}

export function calcolaPrevisione(
  fatture: Fattura[],
  profilo: ProfiloFiscale,
  anno: number
): Previsione {
  const attive = fatture.filter(
    (f) =>
      f.tipo === 'attiva' &&
      f.stato_sdi !== 'scartata' &&
      new Date(f.data).getFullYear() === anno
  )

  // Ripartizione multi-ATECO: ogni fattura è attribuita a un codice
  const perAteco = new Map<string, number>()
  for (const f of attive) {
    const codice = f.ateco_codice || profilo.ateco_codici.find((a) => a.prevalente)?.codice || ''
    perAteco.set(codice, (perAteco.get(codice) || 0) + f.importo)
  }

  const breakdown: BreakdownAteco[] = [...perAteco.entries()].map(([codice, ricavi]) => {
    const coeff =
      profilo.ateco_codici.find((a) => a.codice === codice)?.coeff ?? coeffAteco(codice)
    return { codice, ricavi, coeff, redditoImponibile: ricavi * coeff }
  })

  const ricaviTotali = breakdown.reduce((s, b) => s + b.ricavi, 0)
  const redditoImponibile = breakdown.reduce((s, b) => s + b.redditoImponibile, 0)

  const aliquotaInps = profilo.aliquota_inps
  const contributiInpsStimati = redditoImponibile * aliquotaInps
  const redditoNetto = Math.max(0, redditoImponibile - contributiInpsStimati)

  const aliquotaSostitutiva = aliquotaSostitutivaPerAnno(profilo, anno)
  const impostaSostitutiva = Math.max(0, redditoNetto * aliquotaSostitutiva)

  const totaleDovutoStimato = contributiInpsStimati + impostaSostitutiva
  const sogliaRicavi = param('soglia_ricavi_forfettario')
  const sogliaEsclusione = param('soglia_esclusione_immediata')
  const sogliaPreavviso = param('soglia_preavviso')

  return {
    anno,
    ricaviTotali,
    breakdown,
    redditoImponibile,
    aliquotaInps,
    contributiInpsStimati,
    redditoNetto,
    aliquotaSostitutiva,
    impostaSostitutiva,
    totaleDovutoStimato,
    aliquotaEffettiva: ricaviTotali > 0 ? totaleDovutoStimato / ricaviTotali : 0,
    sogliaRicavi,
    sogliaEsclusione,
    residuoSoglia: Math.max(0, sogliaRicavi - ricaviTotali),
    percentualeSoglia: Math.min(1, ricaviTotali / sogliaRicavi),
    alertPreavviso: ricaviTotali > sogliaPreavviso,
    alertSoglia: ricaviTotali > sogliaRicavi,
    alertEsclusione: ricaviTotali > sogliaEsclusione,
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function fmtEuro(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export function fmtPct(n: number): string {
  return (n * 100).toLocaleString('it-IT', { maximumFractionDigits: 2 }) + '%'
}
