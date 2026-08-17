import { Cliente, Fattura, ProfiloFiscale } from '../src/types'

export function makeProfilo(overrides: Partial<ProfiloFiscale> = {}): ProfiloFiscale {
  return {
    id: 'p1',
    denominazione: 'Neurora SRL',
    piva: '01287030777',
    cf: 'PNTDVD88L28F052K',
    indirizzo: 'Via Vernazzola 11/c',
    comune: 'Cilavegna',
    provincia: 'PV',
    cap: '27024',
    pec: 'drylandstudio@pec.it',
    rea: 'MT-87391',
    regime: 'forfettario',
    ateco_codici: [
      { codice: '59.20.3', descrizione: 'Studi di registrazione sonora', coeff: 0.67, prevalente: true },
      { codice: '62.01.00', descrizione: 'Elaborazione dati', coeff: 0.67, prevalente: false },
    ],
    aliquota_sostitutiva: 0.15,
    aliquota_inps: 0.2607,
    gestione_inps: 'separata',
    data_apertura_piva: '2015-04-01',
    ...overrides,
  }
}

export function makeFattura(overrides: Partial<Fattura> = {}): Fattura {
  return {
    id: 'f1',
    numero: '1/2026',
    data: '2026-03-15',
    tipo: 'attiva',
    cliente_id: 'c1',
    cliente_denominazione: 'Cliente Test',
    importo: 1000,
    descrizione: 'Prestazione di servizi',
    ateco_codice: '59.20.3',
    bollo: true,
    stato_sdi: 'consegnata',
    ...overrides,
  }
}

export function makeCliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id: 'c1',
    denominazione: 'Cliente Test SRL',
    piva: '01234567890',
    cf: 'AAABBB12C34D567E',
    codice_destinatario: '0000000',
    pec_destinatario: '',
    indirizzo: 'Via Roma 1',
    comune: 'Milano',
    provincia: 'MI',
    cap: '20100',
    paese: 'IT',
    ...overrides,
  }
}
