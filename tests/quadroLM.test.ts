import { describe, it, expect } from 'vitest'
import { compilaQuadroLM } from '../src/engine/quadroLM'
import { makeProfilo, makeFattura } from './fixtures'

describe('compilaQuadroLM', () => {
  it('pre-compila il Quadro LM con principio di cassa', () => {
    const profilo = makeProfilo()
    const fatture = [makeFattura({ importo: 10000, ateco_codice: '59.20.3' })]
    const lm = compilaQuadroLM(fatture, profilo, 2026, 1000, 200)

    expect(lm.redditoLordo).toBe(6700)
    expect(lm.contributiVersati).toBe(1000)
    expect(lm.redditoNetto).toBe(5700)
    expect(lm.impostaSostitutiva).toBe(855) // 5700 * 15%
    expect(lm.accontiVersati).toBe(200)
    expect(lm.saldo).toBe(655) // 855 - 200 (a debito)

    const lm34 = lm.righe.find((r) => r.rigo === 'LM34')
    expect(lm34?.valore).toBe(6700)

    const lm35 = lm.righe.find((r) => r.rigo === 'LM35')
    expect(lm35?.valore).toBe(1000)

    const lm46 = lm.righe.find((r) => r.rigo === 'LM46/LM47')
    expect(lm46?.valore).toBe(655)
    expect(lm46?.descrizione).toContain('a debito')
  })

  it('usa il 5% per chi è nei primi 5 anni di attività', () => {
    const profilo = makeProfilo({ data_apertura_piva: '2024-01-01' })
    const fatture = [makeFattura({ importo: 10000 })]
    const lm = compilaQuadroLM(fatture, profilo, 2026, 0, 0)
    // reddito netto 6700 * 5%
    expect(lm.impostaSostitutiva).toBe(335)
  })

  it('saldo negativo → imposta a credito', () => {
    const profilo = makeProfilo()
    const fatture = [makeFattura({ importo: 1000 })]
    // reddito lordo 670, contributi 0, imposta = 670 * 0.15 = 100.50, acconti 200
    const lm = compilaQuadroLM(fatture, profilo, 2026, 0, 200)
    expect(lm.saldo).toBe(-99.5)
    const lm46 = lm.righe.find((r) => r.rigo === 'LM46/LM47')
    expect(lm46?.descrizione).toContain('a credito')
    expect(lm46?.valore).toBe(99.5)
  })
})
