// Imposta di bollo virtuale su fatture elettroniche.
// 2 € su fatture > 77,47 € (strettamente maggiore) senza IVA.
// Versamento trimestrale con codici tributo 2521-2524 (D-015, confermati).

import { Fattura, RigaF24 } from '../types'
import { param, paramStr } from './datiNormativi'
import { round2 } from './fiscale'

export function bolloDovuto(importo: number): boolean {
  return importo > param('bollo_soglia')
}

export interface BolloTrimestre {
  trimestre: 1 | 2 | 3 | 4
  numeroFatture: number
  importo: number
  codiceTributo: string
  scadenza: string
}

// Scadenze versamento bollo (regime attuale): I trim → 31/5, II → 30/9, III → 30/11, IV → 28/2 anno succ.
const SCADENZE_BOLLO: Record<number, (anno: number) => string> = {
  1: (a) => `${a}-05-31`,
  2: (a) => `${a}-09-30`,
  3: (a) => `${a}-11-30`,
  4: (a) => `${a + 1}-02-28`,
}

export function calcolaBolloTrimestri(fatture: Fattura[], anno: number): BolloTrimestre[] {
  const risultato: BolloTrimestre[] = []
  for (const t of [1, 2, 3, 4] as const) {
    const fattureTrim = fatture.filter((f) => {
      const d = new Date(f.data)
      return (
        f.tipo === 'attiva' &&
        f.bollo &&
        f.stato_sdi !== 'scartata' &&
        d.getFullYear() === anno &&
        Math.floor(d.getMonth() / 3) + 1 === t
      )
    })
    risultato.push({
      trimestre: t,
      numeroFatture: fattureTrim.length,
      importo: round2(fattureTrim.length * param('bollo_importo')),
      codiceTributo: paramStr(`codice_tributo_bollo_${t}`),
      scadenza: SCADENZE_BOLLO[t](anno),
    })
  }
  return risultato
}

export function righeF24Bollo(trimestri: BolloTrimestre[], anno: number): RigaF24[] {
  return trimestri
    .filter((t) => t.importo > 0)
    .map((t) => ({
      sezione: 'erario' as const,
      codice: t.codiceTributo,
      anno: String(anno),
      importo: t.importo,
      descrizione: `Bollo fatture elettroniche — ${t.trimestre}° trimestre ${anno}`,
    }))
}
