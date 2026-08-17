import { describe, it, expect } from 'vitest'
import {
  calcolaAcconto,
  calcolaRate,
  calcolaRavvedimento,
  generaF24Giugno,
  generaF24Novembre,
  scadenzaPerTipo,
} from '../src/engine/f24'

describe('calcolaAcconto', () => {
  it('metodo storico: 100% split 50/50', () => {
    const a = calcolaAcconto(1000)
    expect(a.totale).toBe(1000)
    expect(a.primaRata).toBe(500)
    expect(a.secondaRata).toBe(500)
    expect(a.nonDovuto).toBe(false)
    expect(a.unicaSoluzione).toBe(false)
  })

  it('acconto non dovuto sotto 51,65 €', () => {
    const a = calcolaAcconto(40)
    expect(a.nonDovuto).toBe(true)
    expect(a.totale).toBe(0)
    expect(a.primaRata).toBe(0)
    expect(a.secondaRata).toBe(0)
  })

  it('unica soluzione entro 257,52 €', () => {
    const a = calcolaAcconto(200)
    expect(a.unicaSoluzione).toBe(true)
    expect(a.totale).toBe(200)
    expect(a.primaRata).toBe(0)
    expect(a.secondaRata).toBe(200)
  })

  it('soglia 51,65 € inclusa: non è "non dovuto"', () => {
    const a = calcolaAcconto(51.65)
    expect(a.nonDovuto).toBe(false)
    expect(a.unicaSoluzione).toBe(true)
  })
})

describe('generaF24Giugno', () => {
  const base = {
    anno: 2025,
    impostaAnnoRiferimento: 2000,
    accontiVersatiAnnoRiferimento: 1000,
    inpsAnnoRiferimento: 3000,
    inpsAccontiVersati: 1500,
    primoAnnoAttivita: false,
  }

  it('genera saldo imposta, saldo INPS e 1° acconto', () => {
    const r = generaF24Giugno(base)
    expect(r.righe).toHaveLength(4)
    expect(r.totale).toBe(5000)

    const erarioSaldo = r.righe.find((x) => x.codice === '1790')
    expect(erarioSaldo).toMatchObject({ sezione: 'erario', anno: '2025', importo: 1000 })

    const inpsSaldo = r.righe.find((x) => x.sezione === 'inps' && x.anno === '2025')
    expect(inpsSaldo).toMatchObject({ codice: 'P10', importo: 1500 })

    const acconto1 = r.righe.find((x) => x.codice === '1791')
    expect(acconto1).toMatchObject({ anno: '2026', importo: 1000 })

    const inpsAcconto = r.righe.find((x) => x.sezione === 'inps' && x.anno === '2026')
    expect(inpsAcconto).toMatchObject({ importo: 1500 })
  })

  it('primo anno: nessun acconto', () => {
    const r = generaF24Giugno({ ...base, primoAnnoAttivita: true })
    expect(r.righe).toHaveLength(2) // solo saldi imposta e INPS
    expect(r.righe.some((x) => x.codice === '1791')).toBe(false)
    expect(r.note.some((n) => n.includes('Primo anno'))).toBe(true)
  })

  it('saldo imposta a credito non genera riga ma una nota', () => {
    const r = generaF24Giugno({
      ...base,
      impostaAnnoRiferimento: 500,
      accontiVersatiAnnoRiferimento: 800,
    })
    expect(r.righe.some((x) => x.codice === '1790')).toBe(false)
    expect(r.note.some((n) => n.includes('a credito'))).toBe(true)
  })
})

describe('generaF24Novembre', () => {
  const base = {
    anno: 2025,
    impostaAnnoRiferimento: 2000,
    accontiVersatiAnnoRiferimento: 1000,
    inpsAnnoRiferimento: 3000,
    inpsAccontiVersati: 1500,
    primoAnnoAttivita: false,
  }

  it('genera 2° acconto imposta e INPS', () => {
    const r = generaF24Novembre(base)
    expect(r.righe).toHaveLength(2)
    expect(r.totale).toBe(2500)

    const acconto2 = r.righe.find((x) => x.codice === '1792')
    expect(acconto2).toMatchObject({ anno: '2026', importo: 1000 })

    const inps = r.righe.find((x) => x.sezione === 'inps')
    expect(inps).toMatchObject({ importo: 1500 })
  })

  it('primo anno: nessuna riga', () => {
    const r = generaF24Novembre({ ...base, primoAnnoAttivita: true })
    expect(r.righe).toHaveLength(0)
    expect(r.totale).toBe(0)
  })

  it('unica soluzione: 2° acconto porta l’intero importo', () => {
    const r = generaF24Novembre({ ...base, impostaAnnoRiferimento: 200 })
    const acconto2 = r.righe.find((x) => x.codice === '1792')
    expect(acconto2?.importo).toBe(200)
  })
})

describe('calcolaRate', () => {
  it('prima rata senza interessi, poi interessi 4%/12 mensili', () => {
    const rate = calcolaRate(1200, 12)
    expect(rate).toHaveLength(12)
    expect(rate[0].rata).toBe(100)
    expect(rate[0].interessiTotali).toBe(0)
    expect(rate[1].interessiTotali).toBe(0.33) // 100 * 0.04/12 * 1
    expect(rate[1].rata).toBe(100.33)
  })
})

describe('calcolaRavvedimento', () => {
  it('sprint: 1/200 della sanzione base per giorno (art. 13 DL 472/1997)', () => {
    const r14 = calcolaRavvedimento(1000, 14)
    expect(r14.sanzione).toBe(17.5) // 1.75% (fix bug pre-integrazione)
    expect(r14.descrizione).toContain('sprint')

    const r10 = calcolaRavvedimento(1000, 10)
    expect(r10.sanzione).toBe(12.5)
    expect(r10.interessi).toBe(0.44) // 1000 * 0.016 * 10/365
    expect(r10.totale).toBe(1012.94)
  })

  it('breve: 1/10 della sanzione base entro 30 gg', () => {
    const r = calcolaRavvedimento(1000, 20)
    expect(r.sanzione).toBe(25)
    expect(r.descrizione).toContain('breve')
  })

  it('intermedio: 1/9 entro 90 gg', () => {
    const r = calcolaRavvedimento(1000, 60)
    expect(r.sanzione).toBeCloseTo(27.78, 2)
  })

  it('lungo: 1/8 entro 1 anno', () => {
    const r = calcolaRavvedimento(1000, 200)
    expect(r.sanzione).toBe(31.25)
  })

  it('oltre 1 anno: 1/7', () => {
    const r = calcolaRavvedimento(1000, 400)
    expect(r.sanzione).toBeCloseTo(35.71, 2)
  })
})

describe('scadenzaPerTipo', () => {
  it('restituisce le scadenze corrette per il 2026', () => {
    expect(scadenzaPerTipo('saldo_acconto1', 2026)).toBe('2026-06-30')
    expect(scadenzaPerTipo('acconto2', 2026)).toBe('2026-11-30')
    expect(scadenzaPerTipo('bollo', 2026)).toBe('2026-12-31')
  })
})
