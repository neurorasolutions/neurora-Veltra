// Parametri normativi verificati (data verifica: 11/07/2026).
// Ogni valore ha fonte tracciata — vedi 00_architettura_e_decisioni.md §5.3.
// Principio D-006: il motore di calcolo legge da qui, non da costanti sparse.

export interface DatoNormativo {
  chiave: string
  valore: number | string
  descrizione: string
  fonte: string
  data_verifica: string
}

export const DATI_NORMATIVI_2026: DatoNormativo[] = [
  { chiave: 'imposta_sostitutiva_forfettario', valore: 0.15, descrizione: 'Imposta sostitutiva regime forfettario', fonte: 'Art. 1 c.54-89 L.190/2014', data_verifica: '2026-07-11' },
  { chiave: 'imposta_sostitutiva_agevolata', valore: 0.05, descrizione: 'Imposta sostitutiva agevolata (primi 5 anni)', fonte: 'Art. 1 c.54 L.190/2014', data_verifica: '2026-07-11' },
  { chiave: 'coeff_ateco_59.20.3', valore: 0.67, descrizione: 'Coefficiente redditività ATECO 59.20.3', fonte: 'Allegato 2 L.190/2014', data_verifica: '2026-07-11' },
  { chiave: 'coeff_ateco_62.01.00', valore: 0.67, descrizione: 'Coefficiente redditività ATECO 62.01.00', fonte: 'Allegato 2 L.190/2014', data_verifica: '2026-07-11' },
  { chiave: 'aliquota_inps_gestione_separata', valore: 0.2607, descrizione: 'Aliquota INPS Gestione Separata 2026', fonte: 'INPS 2026', data_verifica: '2026-07-11' },
  { chiave: 'aliquota_inps_con_altra_copertura', valore: 0.24, descrizione: 'Aliquota INPS ridotta (altra copertura)', fonte: 'INPS 2026', data_verifica: '2026-07-11' },
  { chiave: 'soglia_ricavi_forfettario', valore: 85000, descrizione: 'Soglia ricavi regime forfettario', fonte: 'Art. 1 c.54 L.190/2014', data_verifica: '2026-07-11' },
  { chiave: 'soglia_esclusione_immediata', valore: 100000, descrizione: 'Soglia esclusione immediata dal regime', fonte: 'Art. 1 c.57 L.190/2014', data_verifica: '2026-07-11' },
  { chiave: 'soglia_preavviso', valore: 75000, descrizione: 'Soglia alert preavviso (interna)', fonte: 'Scelta di prodotto', data_verifica: '2026-07-11' },
  { chiave: 'acconto_prima_rata', valore: 0.5, descrizione: 'Prima rata acconto (soggetti ISA: 50%)', fonte: 'Art. 58 DL 124/2019; ris. AdE 93/E/2019', data_verifica: '2026-07-11' },
  { chiave: 'acconto_seconda_rata', valore: 0.5, descrizione: 'Seconda rata acconto (50%)', fonte: 'Art. 58 DL 124/2019; ris. AdE 93/E/2019', data_verifica: '2026-07-11' },
  { chiave: 'soglia_acconto_non_dovuto', valore: 51.65, descrizione: 'Sotto questa imposta, acconto non dovuto', fonte: 'Istruzioni F24 (AdE)', data_verifica: '2026-07-11' },
  { chiave: 'soglia_acconto_unica_soluzione', valore: 257.52, descrizione: 'Sotto questa soglia, acconto in unica soluzione a novembre', fonte: 'Istruzioni F24 (AdE)', data_verifica: '2026-07-11' },
  { chiave: 'bollo_importo', valore: 2, descrizione: 'Imposta di bollo per fattura', fonte: 'DPR 642/1972', data_verifica: '2026-07-11' },
  { chiave: 'bollo_soglia', valore: 77.47, descrizione: 'Bollo dovuto su fatture > 77,47 € (strettamente maggiore)', fonte: 'DPR 642/1972', data_verifica: '2026-07-11' },
  { chiave: 'natura_iva_forfettario', valore: 'N2.2', descrizione: 'Natura IVA XML per forfettario', fonte: 'Specifiche FatturaPA (AdE)', data_verifica: '2026-07-11' },
  { chiave: 'tasso_legale_2026', valore: 0.016, descrizione: 'Tasso interesse legale 2026 (1,60%)', fonte: 'DM Economia 10/12/2025, G.U. 289/2025', data_verifica: '2026-07-11' },
  { chiave: 'tasso_rateizzazione_f24', valore: 0.04, descrizione: 'Tasso annuo rateizzazione F24 (fino al 16/12)', fonte: 'Istruzioni F24 (AdE)', data_verifica: '2026-07-11' },
  { chiave: 'sanzione_base_omesso_versamento', valore: 0.25, descrizione: 'Sanzione base omesso versamento (dal 1/9/2024)', fonte: 'D.Lgs. 87/2024', data_verifica: '2026-07-11' },
  { chiave: 'codice_tributo_saldo', valore: '1790', descrizione: 'Imposta sostitutiva — saldo', fonte: 'AdE codici tributo', data_verifica: '2026-07-11' },
  { chiave: 'codice_tributo_acconto_1', valore: '1791', descrizione: 'Imposta sostitutiva — 1° acconto', fonte: 'AdE codici tributo', data_verifica: '2026-07-11' },
  { chiave: 'codice_tributo_acconto_2', valore: '1792', descrizione: 'Imposta sostitutiva — 2° acconto o unica soluzione', fonte: 'AdE codici tributo', data_verifica: '2026-07-11' },
  { chiave: 'causale_inps_gestione_separata', valore: 'P10', descrizione: 'Causale INPS Gestione Separata professionisti (sezione INPS F24)', fonte: 'INPS — F24 professionisti Gestione Separata', data_verifica: '2026-07-11' },
  { chiave: 'codice_tributo_bollo_1', valore: '2521', descrizione: 'Bollo fatture elettroniche — I trimestre', fonte: 'AdE codici tributo (confermati)', data_verifica: '2026-07-11' },
  { chiave: 'codice_tributo_bollo_2', valore: '2522', descrizione: 'Bollo fatture elettroniche — II trimestre', fonte: 'AdE codici tributo (confermati)', data_verifica: '2026-07-11' },
  { chiave: 'codice_tributo_bollo_3', valore: '2523', descrizione: 'Bollo fatture elettroniche — III trimestre', fonte: 'AdE codici tributo (confermati)', data_verifica: '2026-07-11' },
  { chiave: 'codice_tributo_bollo_4', valore: '2524', descrizione: 'Bollo fatture elettroniche — IV trimestre', fonte: 'AdE codici tributo (confermati)', data_verifica: '2026-07-11' },
  { chiave: 'scadenza_f24_giugno', valore: '06-30', descrizione: 'Scadenza saldo + 1° acconto', fonte: 'Istruzioni F24', data_verifica: '2026-07-11' },
  { chiave: 'scadenza_f24_novembre', valore: '11-30', descrizione: 'Scadenza 2° acconto', fonte: 'Istruzioni F24', data_verifica: '2026-07-11' },
  { chiave: 'scadenza_redditi_pf_2026', valore: '2026-11-02', descrizione: 'Scadenza Redditi PF 2026 (31/10 sabato → slitta)', fonte: 'AdE', data_verifica: '2026-07-11' },
]

export function param(chiave: string): number {
  const d = DATI_NORMATIVI_2026.find((x) => x.chiave === chiave)
  if (!d) throw new Error(`Dato normativo mancante: ${chiave}`)
  return Number(d.valore)
}

export function paramStr(chiave: string): string {
  const d = DATI_NORMATIVI_2026.find((x) => x.chiave === chiave)
  if (!d) throw new Error(`Dato normativo mancante: ${chiave}`)
  return String(d.valore)
}

export function coeffAteco(codice: string): number {
  const d = DATI_NORMATIVI_2026.find((x) => x.chiave === `coeff_ateco_${codice}`)
  return d ? Number(d.valore) : 0.67 // default gruppo "altre attività"
}
