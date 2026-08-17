import { describe, it, expect } from 'vitest'
import {
  DATI_NORMATIVI_2026,
  param,
  paramStr,
  coeffAteco,
} from '../src/engine/datiNormativi'

describe('datiNormativi — integrità dei dati', () => {
  it('non ha chiavi duplicate', () => {
    const chiavi = DATI_NORMATIVI_2026.map((d) => d.chiave)
    expect(new Set(chiavi).size).toBe(chiavi.length)
  })

  it('ogni voce ha fonte e data di verifica', () => {
    for (const d of DATI_NORMATIVI_2026) {
      expect(d.fonte.trim()).not.toBe('')
      expect(d.data_verifica).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('i valori chiave 2026 sono quelli attesi', () => {
    expect(param('imposta_sostitutiva_forfettario')).toBe(0.15)
    expect(param('imposta_sostitutiva_agevolata')).toBe(0.05)
    expect(param('aliquota_inps_gestione_separata')).toBeCloseTo(0.2607, 5)
    expect(param('coeff_ateco_59.20.3')).toBe(0.67)
    expect(param('soglia_ricavi_forfettario')).toBe(85000)
    expect(param('soglia_esclusione_immediata')).toBe(100000)
    expect(param('acconto_prima_rata')).toBe(0.5)
    expect(param('acconto_seconda_rata')).toBe(0.5)
    expect(param('tasso_legale_2026')).toBeCloseTo(0.016, 5)
    expect(param('sanzione_base_omesso_versamento')).toBe(0.25)
    expect(param('bollo_soglia')).toBe(77.47)
    expect(param('bollo_importo')).toBe(2)
  })

  it('espone i codici tributo come stringhe', () => {
    expect(paramStr('codice_tributo_saldo')).toBe('1790')
    expect(paramStr('codice_tributo_acconto_1')).toBe('1791')
    expect(paramStr('codice_tributo_acconto_2')).toBe('1792')
    expect(paramStr('causale_inps_gestione_separata')).toBe('P10')
    expect(paramStr('natura_iva_forfettario')).toBe('N2.2')
  })

  it('coeffAteco restituisce il coefficiente noto o il default 0.67', () => {
    expect(coeffAteco('59.20.3')).toBe(0.67)
    expect(coeffAteco('62.01.00')).toBe(0.67)
    expect(coeffAteco('99.99.99')).toBe(0.67)
  })

  it('param lancia errore su chiave inesistente', () => {
    expect(() => param('chiave_inesistente')).toThrow(/mancante/)
  })
})
