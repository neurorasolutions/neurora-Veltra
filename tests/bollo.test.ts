import { describe, it, expect } from 'vitest'
import { bolloDovuto, calcolaBolloTrimestri, righeF24Bollo } from '../src/engine/bollo'
import { makeFattura } from './fixtures'

describe('bolloDovuto', () => {
  it('è dovuto solo strettamente sopra 77,47 €', () => {
    expect(bolloDovuto(77.47)).toBe(false)
    expect(bolloDovuto(77.48)).toBe(true)
    expect(bolloDovuto(100)).toBe(true)
    expect(bolloDovuto(0)).toBe(false)
  })
})

describe('calcolaBolloTrimestri', () => {
  it('distribuisce le fatture nei 4 trimestri con i codici tributo giusti', () => {
    const fatture = [
      makeFattura({ id: 'q1', data: '2026-02-15', bollo: true, stato_sdi: 'consegnata' }),
      makeFattura({ id: 'q1b', data: '2026-03-31', bollo: true, stato_sdi: 'inviata' }),
      makeFattura({ id: 'q4', data: '2026-12-10', bollo: true, stato_sdi: 'consegnata' }),
      makeFattura({ id: 'no-bollo', data: '2026-04-01', bollo: false, stato_sdi: 'consegnata' }),
      makeFattura({ id: 'scartata', data: '2026-04-01', bollo: true, stato_sdi: 'scartata' }),
      makeFattura({ id: 'altro-anno', data: '2025-02-15', bollo: true, stato_sdi: 'consegnata' }),
    ]
    const trimestri = calcolaBolloTrimestri(fatture, 2026)

    expect(trimestri).toHaveLength(4)
    expect(trimestri[0]).toMatchObject({
      trimestre: 1,
      numeroFatture: 2,
      importo: 4,
      codiceTributo: '2521',
      scadenza: '2026-05-31',
    })
    expect(trimestri[1].numeroFatture).toBe(0)
    expect(trimestri[2].numeroFatture).toBe(0)
    expect(trimestri[3]).toMatchObject({
      trimestre: 4,
      numeroFatture: 1,
      importo: 2,
      codiceTributo: '2524',
      scadenza: '2027-02-28',
    })
  })
})

describe('righeF24Bollo', () => {
  it('genera righe F24 solo per i trimestri con bollo dovuto', () => {
    const trimestri = calcolaBolloTrimestri(
      [makeFattura({ id: 'q1', data: '2026-01-10', bollo: true })],
      2026
    )
    const righe = righeF24Bollo(trimestri, 2026)
    expect(righe).toHaveLength(1)
    expect(righe[0]).toMatchObject({ sezione: 'erario', codice: '2521', anno: '2026', importo: 2 })
  })
})
