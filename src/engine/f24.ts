// Generazione F24 — regime forfettario.
// Codici tributo: 1790 (saldo), 1791 (1° acconto), 1792 (2° acconto).
// INPS Gestione Separata: causale P10 (sezione INPS).
// Acconti 50/50 (soggetti ISA — art. 58 DL 124/2019, D-011).
// Metodo storico di default (D-020): acconto = 100% dell'imposta anno precedente.

import { RigaF24, TipoF24 } from '../types'
import { param, paramStr } from './datiNormativi'
import { round2 } from './fiscale'

export interface InputF24 {
  anno: number // anno d'imposta di riferimento (es. saldo 2025 si paga a giugno 2026)
  impostaAnnoRiferimento: number // imposta sostitutiva dovuta per l'anno di riferimento
  accontiVersatiAnnoRiferimento: number // acconti già versati per quell'anno
  inpsAnnoRiferimento: number // contributi INPS a saldo per l'anno di riferimento
  inpsAccontiVersati: number
  primoAnnoAttivita: boolean // primo anno: acconto non dovuto
}

export interface RisultatoF24 {
  righe: RigaF24[]
  totale: number
  note: string[]
}

// F24 di giugno: saldo anno precedente + 1° acconto anno corrente (metodo storico)
export function generaF24Giugno(input: InputF24): RisultatoF24 {
  const righe: RigaF24[] = []
  const note: string[] = []
  const annoRif = String(input.anno)
  const annoAcconto = String(input.anno + 1)

  const saldoImposta = round2(input.impostaAnnoRiferimento - input.accontiVersatiAnnoRiferimento)
  if (saldoImposta > 0) {
    righe.push({
      sezione: 'erario',
      codice: paramStr('codice_tributo_saldo'),
      anno: annoRif,
      importo: saldoImposta,
      descrizione: `Imposta sostitutiva — saldo ${annoRif}`,
    })
  } else if (saldoImposta < 0) {
    note.push(
      `Saldo a credito di ${Math.abs(saldoImposta).toFixed(2)} €: compensabile in F24 (codice 1790 a credito) o riportabile.`
    )
  }

  const saldoInps = round2(input.inpsAnnoRiferimento - input.inpsAccontiVersati)
  if (saldoInps > 0) {
    righe.push({
      sezione: 'inps',
      codice: paramStr('causale_inps_gestione_separata'),
      anno: annoRif,
      importo: saldoInps,
      descrizione: `INPS Gestione Separata — saldo ${annoRif} (causale P10)`,
    })
  }

  // Acconti anno successivo — metodo storico
  if (!input.primoAnnoAttivita) {
    const acconto = calcolaAcconto(input.impostaAnnoRiferimento)
    if (acconto.primaRata > 0) {
      righe.push({
        sezione: 'erario',
        codice: paramStr('codice_tributo_acconto_1'),
        anno: annoAcconto,
        importo: acconto.primaRata,
        descrizione: `Imposta sostitutiva — 1° acconto ${annoAcconto} (50%)`,
      })
    }
    if (acconto.unicaSoluzione) {
      note.push(
        `Acconto ${annoAcconto} in unica soluzione a novembre (totale ≤ ${param('soglia_acconto_unica_soluzione').toFixed(2)} €).`
      )
    }
    if (acconto.nonDovuto) {
      note.push(
        `Acconto ${annoAcconto} non dovuto (imposta ${annoRif} < ${param('soglia_acconto_non_dovuto').toFixed(2)} €).`
      )
    }
    // Acconto INPS (metodo storico, 50/50 sul dovuto anno precedente)
    const accontoInps1 = round2(input.inpsAnnoRiferimento * param('acconto_prima_rata'))
    if (accontoInps1 > 0) {
      righe.push({
        sezione: 'inps',
        codice: paramStr('causale_inps_gestione_separata'),
        anno: annoAcconto,
        importo: accontoInps1,
        descrizione: `INPS Gestione Separata — 1° acconto ${annoAcconto} (causale P10)`,
      })
    }
  } else {
    note.push('Primo anno di regime forfettario: acconto non dovuto.')
  }

  return { righe, totale: round2(righe.reduce((s, r) => s + r.importo, 0)), note }
}

// F24 di novembre: 2° acconto anno corrente
export function generaF24Novembre(input: InputF24): RisultatoF24 {
  const righe: RigaF24[] = []
  const note: string[] = []
  const annoAcconto = String(input.anno + 1)

  if (input.primoAnnoAttivita) {
    return { righe, totale: 0, note: ['Primo anno di regime forfettario: acconto non dovuto.'] }
  }

  const acconto = calcolaAcconto(input.impostaAnnoRiferimento)
  if (acconto.nonDovuto) {
    note.push('Acconto non dovuto (sotto soglia 51,65 €).')
  } else {
    const importo = acconto.unicaSoluzione ? acconto.totale : acconto.secondaRata
    righe.push({
      sezione: 'erario',
      codice: paramStr('codice_tributo_acconto_2'),
      anno: annoAcconto,
      importo,
      descrizione: acconto.unicaSoluzione
        ? `Imposta sostitutiva — acconto ${annoAcconto} unica soluzione`
        : `Imposta sostitutiva — 2° acconto ${annoAcconto} (50%)`,
    })
  }

  const accontoInps2 = round2(input.inpsAnnoRiferimento * param('acconto_seconda_rata'))
  if (accontoInps2 > 0) {
    righe.push({
      sezione: 'inps',
      codice: paramStr('causale_inps_gestione_separata'),
      anno: annoAcconto,
      importo: accontoInps2,
      descrizione: `INPS Gestione Separata — 2° acconto ${annoAcconto} (causale P10)`,
    })
  }

  return { righe, totale: round2(righe.reduce((s, r) => s + r.importo, 0)), note }
}

export function calcolaAcconto(impostaAnnoPrecedente: number): {
  totale: number
  primaRata: number
  secondaRata: number
  nonDovuto: boolean
  unicaSoluzione: boolean
} {
  const totale = round2(impostaAnnoPrecedente) // metodo storico: 100%
  const nonDovuto = impostaAnnoPrecedente < param('soglia_acconto_non_dovuto')
  const unicaSoluzione = !nonDovuto && totale <= param('soglia_acconto_unica_soluzione')
  if (nonDovuto) return { totale: 0, primaRata: 0, secondaRata: 0, nonDovuto, unicaSoluzione: false }
  if (unicaSoluzione) return { totale, primaRata: 0, secondaRata: totale, nonDovuto: false, unicaSoluzione }
  return {
    totale,
    primaRata: round2(totale * param('acconto_prima_rata')),
    secondaRata: round2(totale * param('acconto_seconda_rata')),
    nonDovuto: false,
    unicaSoluzione: false,
  }
}

// Rateizzazione: fino al 16 dicembre, interessi 4% annuo (D-016)
export function calcolaRate(totale: number, numeroRate: number): { rata: number; interessiTotali: number }[] {
  const tasso = param('tasso_rateizzazione_f24')
  const quota = totale / numeroRate
  return Array.from({ length: numeroRate }, (_, i) => {
    // interessi: 4%/12 per ogni mese di dilazione dalla prima rata
    const interessi = i === 0 ? 0 : round2(quota * (tasso / 12) * i)
    return { rata: round2(quota + interessi), interessiTotali: interessi }
  })
}

// Ravvedimento operoso — base sanzione 25% (D.Lgs. 87/2024, D-014)
export function calcolaRavvedimento(importo: number, giorniRitardo: number): {
  sanzione: number
  interessi: number
  totale: number
  descrizione: string
} {
  const base = param('sanzione_base_omesso_versamento') // 0.25
  let frazione: number
  let descrizione: string
  if (giorniRitardo <= 14) {
    frazione = (base / 200) * giorniRitardo // sprint: 1/200 della sanzione base per giorno (art. 13 DL 472/1997)
    descrizione = `Ravvedimento sprint (${giorniRitardo} gg)`
  } else if (giorniRitardo <= 30) {
    frazione = base / 10
    descrizione = 'Ravvedimento breve (entro 30 gg)'
  } else if (giorniRitardo <= 90) {
    frazione = base / 9
    descrizione = 'Ravvedimento intermedio (entro 90 gg)'
  } else if (giorniRitardo <= 365) {
    frazione = base / 8
    descrizione = 'Ravvedimento lungo (entro 1 anno)'
  } else {
    frazione = base / 7
    descrizione = 'Ravvedimento oltre 1 anno'
  }
  const sanzione = round2(importo * frazione)
  const interessi = round2(importo * param('tasso_legale_2026') * (giorniRitardo / 365))
  return { sanzione, interessi, totale: round2(importo + sanzione + interessi), descrizione }
}

export function scadenzaPerTipo(tipo: TipoF24, annoVersamento: number): string {
  if (tipo === 'saldo_acconto1') return `${annoVersamento}-${paramStr('scadenza_f24_giugno')}`
  if (tipo === 'acconto2') return `${annoVersamento}-${paramStr('scadenza_f24_novembre')}`
  return `${annoVersamento}-12-31`
}
