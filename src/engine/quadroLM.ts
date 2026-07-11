// Pre-compilazione Quadro LM — Modello Redditi PF (sezione forfettari).
// Principio di cassa (D-012): i contributi si deducono per quanto VERSATO
// nell'anno, non per quanto maturato.
// La piattaforma pre-compila e genera istruzioni; l'invio telematico resta
// a carico dell'utente via Fisconline (D-002, D-021).

import { Fattura, ProfiloFiscale } from '../types'
import { aliquotaSostitutivaPerAnno, round2 } from './fiscale'
import { coeffAteco } from './datiNormativi'

export interface RigaLM {
  rigo: string
  descrizione: string
  valore: number | string
}

export interface QuadroLM {
  anno: number
  righe: RigaLM[]
  redditoLordo: number
  contributiVersati: number
  redditoNetto: number
  impostaSostitutiva: number
  accontiVersati: number
  saldo: number // positivo = a debito, negativo = a credito
}

export function compilaQuadroLM(
  fatture: Fattura[],
  profilo: ProfiloFiscale,
  anno: number,
  contributiVersati: number, // per cassa: quanto effettivamente versato nell'anno
  accontiVersati: number
): QuadroLM {
  const attive = fatture.filter(
    (f) =>
      f.tipo === 'attiva' &&
      f.stato_sdi !== 'scartata' &&
      new Date(f.data).getFullYear() === anno
  )

  const perAteco = new Map<string, number>()
  for (const f of attive) {
    const codice = f.ateco_codice || profilo.ateco_codici.find((a) => a.prevalente)?.codice || ''
    perAteco.set(codice, (perAteco.get(codice) || 0) + f.importo)
  }

  const righe: RigaLM[] = []
  let redditoLordo = 0
  let i = 0
  for (const [codice, ricavi] of perAteco.entries()) {
    const coeff = profilo.ateco_codici.find((a) => a.codice === codice)?.coeff ?? coeffAteco(codice)
    const reddito = round2(ricavi * coeff)
    redditoLordo += reddito
    righe.push({
      rigo: `LM22${i > 0 ? ` (${i + 1})` : ''}`,
      descrizione: `ATECO ${codice} — ricavi ${ricavi.toFixed(2)} € × coeff. ${(coeff * 100).toFixed(0)}%`,
      valore: reddito,
    })
    i++
  }
  redditoLordo = round2(redditoLordo)

  righe.push({ rigo: 'LM34', descrizione: 'Reddito lordo (somma componenti positivi × coefficiente)', valore: redditoLordo })
  righe.push({
    rigo: 'LM35',
    descrizione: 'Contributi previdenziali versati nell’anno (principio di cassa)',
    valore: round2(contributiVersati),
  })

  const redditoNetto = round2(Math.max(0, redditoLordo - contributiVersati))
  righe.push({ rigo: 'LM36', descrizione: 'Reddito netto', valore: redditoNetto })

  const aliquota = aliquotaSostitutivaPerAnno(profilo, anno)
  righe.push({ rigo: 'LM39', descrizione: `Aliquota imposta sostitutiva (${(aliquota * 100).toFixed(0)}%)`, valore: `${(aliquota * 100).toFixed(0)}%` })

  const imposta = round2(redditoNetto * aliquota)
  righe.push({ rigo: 'LM39 (imposta)', descrizione: 'Imposta sostitutiva dovuta', valore: imposta })
  righe.push({ rigo: 'LM40/LM45', descrizione: 'Acconti versati', valore: round2(accontiVersati) })

  const saldo = round2(imposta - accontiVersati)
  righe.push({
    rigo: 'LM46/LM47',
    descrizione: saldo >= 0 ? 'Imposta a debito (saldo da versare)' : 'Imposta a credito',
    valore: Math.abs(saldo),
  })

  return {
    anno,
    righe,
    redditoLordo,
    contributiVersati: round2(contributiVersati),
    redditoNetto,
    impostaSostitutiva: imposta,
    accontiVersati: round2(accontiVersati),
    saldo,
  }
}
