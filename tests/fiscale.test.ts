import { describe, it, expect } from 'vitest'
import {
  aliquotaSostitutivaPerAnno,
  calcolaPrevisione,
  round2,
  fmtEuro,
} from '../src/engine/fiscale'
import { makeProfilo, makeFattura } from './fixtures'

describe('aliquotaSostitutivaPerAnno', () => {
  it('applica il 5% nei primi 5 anni di attività', () => {
    const profilo = makeProfilo({ data_apertura_piva: '2024-01-01' })
    expect(aliquotaSostitutivaPerAnno(profilo, 2026)).toBe(0.05)
  })

  it('applica il 15% oltre i 5 anni', () => {
    const profilo = makeProfilo({ data_apertura_piva: '2015-04-01' })
    expect(aliquotaSostitutivaPerAnno(profilo, 2026)).toBe(0.15)
  })

  it('applica il 15% esattamente al quinto anno', () => {
    // apertura 2021, anno 2026 → 5 anni → oltre l'agevolazione
    const profilo = makeProfilo({ data_apertura_piva: '2021-01-01' })
    expect(aliquotaSostitutivaPerAnno(profilo, 2026)).toBe(0.15)
  })
})

describe('calcolaPrevisione', () => {
  it('calcola imposta e contributi su una fattura forfettaria', () => {
    const profilo = makeProfilo()
    const fatture = [
      makeFattura({ importo: 10000, ateco_codice: '59.20.3', data: '2026-03-15' }),
    ]
    const p = calcolaPrevisione(fatture, profilo, 2026)

    expect(p.ricaviTotali).toBe(10000)
    expect(p.redditoImponibile).toBeCloseTo(6700, 2)
    expect(p.contributiInpsStimati).toBeCloseTo(1746.69, 2)
    expect(p.redditoNetto).toBeCloseTo(4953.31, 2)
    expect(p.impostaSostitutiva).toBeCloseTo(743.0, 2)
    expect(p.totaleDovutoStimato).toBeCloseTo(2489.69, 2)
  })

  it('ignora le fatture scartate e quelle di altri anni', () => {
    const profilo = makeProfilo()
    const fatture = [
      makeFattura({ id: 'a', importo: 10000, data: '2026-03-15', stato_sdi: 'scartata' }),
      makeFattura({ id: 'b', importo: 5000, data: '2025-12-31' }),
      makeFattura({ id: 'c', importo: 1000, data: '2026-06-01', stato_sdi: 'consegnata' }),
    ]
    const p = calcolaPrevisione(fatture, profilo, 2026)
    expect(p.ricaviTotali).toBe(1000)
  })

  it('ripartisce i ricavi per codice ATECO', () => {
    const profilo = makeProfilo()
    const fatture = [
      makeFattura({ id: 'a', importo: 6000, ateco_codice: '59.20.3' }),
      makeFattura({ id: 'b', importo: 4000, ateco_codice: '62.01.00' }),
    ]
    const p = calcolaPrevisione(fatture, profilo, 2026)
    expect(p.breakdown).toHaveLength(2)
    const byCode = Object.fromEntries(p.breakdown.map((b) => [b.codice, b]))
    expect(byCode['59.20.3'].ricavi).toBe(6000)
    expect(byCode['62.01.00'].ricavi).toBe(4000)
  })

  it('gestisce correttamente le soglie e gli alert', () => {
    const profilo = makeProfilo()
    const sottoSoglia = calcolaPrevisione([makeFattura({ importo: 10000 })], profilo, 2026)
    expect(sottoSoglia.residuoSoglia).toBe(75000)
    expect(sottoSoglia.alertPreavviso).toBe(false)
    expect(sottoSoglia.alertSoglia).toBe(false)
    expect(sottoSoglia.alertEsclusione).toBe(false)

    const oltrePreavviso = calcolaPrevisione([makeFattura({ importo: 76000 })], profilo, 2026)
    expect(oltrePreavviso.alertPreavviso).toBe(true)
    expect(oltrePreavviso.alertSoglia).toBe(false)

    const oltreSoglia = calcolaPrevisione([makeFattura({ importo: 90000 })], profilo, 2026)
    expect(oltreSoglia.alertSoglia).toBe(true)
    expect(oltreSoglia.alertEsclusione).toBe(false)

    const oltreEsclusione = calcolaPrevisione([makeFattura({ importo: 110000 })], profilo, 2026)
    expect(oltreEsclusione.alertEsclusione).toBe(true)
  })
})

describe('utility di formattazione', () => {
  it('round2 arrotonda al centesimo', () => {
    expect(round2(0.33333)).toBe(0.33)
    expect(round2(1.234)).toBe(1.23)
    expect(round2(1.236)).toBe(1.24)
    expect(round2(2)).toBe(2)
  })

  it('fmtEuro produce una stringa in euro con due decimali', () => {
    const s = fmtEuro(1234.5)
    expect(s).toContain('€')
    expect(s).toContain('1234')
    expect(s).toContain(',50')
  })
})
