# Generazione F24

> **Progetto**: Piattaforma fiscale Neurora
> **Data**: 11 luglio 2026

---

## 1. Obiettivo

Calcolare esattamente imposte e contributi dovuti e generare i modelli F24 pronti al pagamento, con codici tributo corretti, importi, scadenze e istruzioni per il versamento. La piattaforma compila l'F24; l'utente lo paga via home banking o F24 web (il pagamento telematico via API banca è post-MVP).

**Per chi**: il founder (forfettario, Gestione Separata INPS), con estensione a tutti i forfettari nel SaaS.

---

## 2. Ambito

### In scope
- Generazione F24 ordinario ( modello F24 standard, non semplificato) con righe precompilate
- Codici tributo per imposta sostitutiva forfettario (1790, 1791, 1792, 1793, 1794)
- Codici tributo per contributi INPS Gestione Separata (PXX — vedi §3)
- Calcolo saldo + acconti (50% / 50%) con logica soglie
- Scadenze automatiche (30 giugno, 30 novembre, o 30 luglio con +0,40%)
- Rateizzazione fino al 16 dicembre (giugno-dicembre) con interessi 4% annuo (codice 1668)
- Istruzioni di pagamento passo-passo (home banking / F24 web)
- PDF stampabile dell'F24 compilato
- Storico F24 generati
- Ravvedimento operoso (calcolo sanzioni + interessi)

### Out of scope (MVP)
- Pagamento telematico via API banca (PSD2/open banking) — post-MVP
- F24 per regimi non forfettari (IVA, IRPEF, IRAP) — post-MVP
- F24 per artigiani/commercianti (codici AP/CP) — il founder è Gestione Separata
- Integrazione con Fisconline per invio telematico dell'F24

---

## 3. Analisi normativa

### 3.1 Codici tributo F24 forfettario

| Codice | Descrizione | Sezione F24 | Scadenza |
|---|---|---|---|
| 1790 | Imposta sostitutiva regime forfettario — saldo | Erario | 30 giugno (anno successivo) |
| 1791 | Imposta sostitutiva regime forfettario — acconto prima rata (50%) | Erario | 30 giugno |
| 1792 | Imposta sostitutiva regime forfettario — acconto seconda rata o unico (50%) | Erario | 30 novembre |
| 1793 | Imposta sostitutiva — sanzioni | Erario | Variabile (ravvedimento) |
| 1794 | Imposta sostitutiva — interessi | Erario | Variabile (ravvedimento/rateizzazione) |
| 1668 | Interessi pagamento dilazionato importi rateizzabili sezione Erario | Erario | Rateizzazione |

**Fonte**: calcoloforfettario.it (verificato 11/07/2026); centrofiscale.com/codici-tributo-f24-elenco-completo-2026/ (verificato 11/07/2026)

### 3.2 Codici tributo INPS Gestione Separata

| Codice | Descrizione | Sezione F24 |
|---|---|---|
| PXX | Contributi Gestione Separata — professionisti senza cassa | INPS |

> **Nota**: Il codice esatto (es. P10, P01, ecc.) varia per anno e categoria. Il codice viene indicato nel prospetto di liquidazione del Modello Redditi PF. Il sistema deve recuperare il codice corretto dalla dichiarazione compilata o da `dati_normativi`. Per il founder: codice Gestione Separata professionisti, aliquota 26,07%.

**Fonte**: forfettari.it (verificato 11/07/2026); f24editabile.com (verificato 11/07/2026)

### 3.3 Logica acconti e saldo

```
SALDO (codice 1790 per imposta, PXX per INPS):
  Importo = imposta dovuta anno precedente − acconti già versati per quell'anno
  Scadenza: 30 giugno dell'anno successivo (o 30 luglio con maggiorazione 0,40%)

ACCONTI:
  Metodo storico (default se anno precedente disponibile):
    Acconto totale = 100% dei versamenti (imposta + INPS) dell'anno precedente
  Metodo previsionale (primo anno o scelta utente):
    Acconto totale = 100% dell'imposta stimata per anno corrente

  Soglie acconto (per ciascuna componente: imposta e INPS separatamente):
    < 51,65 €     → non si versa
    51,65-257,52  → unica soluzione a novembre (codice 1792 / PXX)
    > 257,52      → due rate del 50% ciascuna: 50% a giugno (1791), 50% a novembre (1792)

RATEIZZAZIONE (opzionale, solo saldo + 1° acconto di giugno):
  Fino a 16 dicembre (rate mensili da giugno a dicembre)
  Interessi: codice 1668, tasso 4% annuo (importo × 4% / 12 × numero rate)
  2° acconto di novembre NON è rateizzabile
```

### 3.4 Pagamento F24 per titolari di P.IVA

| Regola | Riferimento |
|---|---|
| Pagamento telematico obbligatorio per titolari di P.IVA | DL 66/2014, art. 11 | 
| Modalità | Home banking (PagoPA), F24 web, intermediari, app banking |
| Compensazione | Possibile usare crediti per compensare debiti (ma il forfettario raramente ha crediti) |

**Fonti**: calcoloforfettario.it (verificato 11/07/2026); f24editabile.com (verificato 11/07/2026)

### 3.5 Ravvedimento operoso

> **Base sanzione aggiornata**: dal 1/9/2024 la sanzione base per omesso/tardivo versamento è **25%** (riforma sanzioni D.Lgs. 87/2024), non più 30%. Le riduzioni da ravvedimento si applicano a questa base. **Modulo da revisionare a parte** — non critico per l'MVP.

| Tipo | Sanzione (su base 25%) | Codice | Note |
|---|---|---|---|
| Entro 14 giorni | 1/200 per giorno di ritardo (sanzione minima 1/200) | 1793 (sanzione) + 1794 (interessi) | Calcolo: importo x (0,25/200) x giorni = 0,125% per giorno |
| Entro 30 giorni | 1/10 della sanzione base (25%) | 1793 | + interessi 1794 al tasso legale |
| Entro 90 giorni | 1/9 della sanzione base (25%) | 1793 | + interessi 1794 |
| Oltre 90 giorni (fino a 1 anno) | 1/8 della sanzione base (25%) | 1793 | + interessi 1794 |

**Fonte**: centrofiscale.com/codici-tributo-f24-elenco-completo-2026/ (verificato 11/07/2026)

---

## 4. Analisi concorrenti (per questa funzione)

| Concorrente | F24 | Come |
|---|---|---|
| Fatture in Cloud | No | Non genera F24 |
| Aruba | No | Non genera F24 |
| Fattura24 | Archiviazione tributi | Solo archiviazione, non genera |
| Fiscozen | Sì (commercialista umano) | Calcola e prepara F24, gestisce pagamenti — incluso nel servizio 499 €/anno |
| Agenzia Entrate | F24 web | Compilazione manuale su portale |
| Strumenti gratuiti (calcoloforfettario.it, f24editabile.com) | Sì, ma manuale | Calcolatori web, non integrati con fatture |

**Cosa possiamo fare meglio**: generazione automatica dell'F24 dalle fatture effettive (nessun calcolo manuale), con codici tributo corretti, scadenze tracciate e istruzioni di pagamento guidate. L'AI può anche avvertire prima della scadenza e calcolare il ravvedimento se in ritardo.

---

## 5. Opzioni tecniche

### Opzione A: Generazione PDF lato server (Edge Function)

| Dimensione | Valutazione |
|---|---|
| Come | Edge Function genera F24 compilato come PDF usando un template (libreria pdf-lib o simile). Salva in Supabase Storage. |
| Pro | Controllo completo del layout, PDF stampabile e pagabile, nessun servizio esterno |
| Contro | Template da mantenere, conformità formato F24 richiede attenzione |
| Rischi | Cambio formato F24 richiede update template |
| **Raccomandazione** | **Sì** — il formato F24 è stabile e ben documentato |

### Opzione B: Generazione F24 Elide/telematico (file .f24)

| Dimensione | Valutazione |
|---|---|
| Come | Genera file telematico F24 in formato XML/EDF per invio via Fisconline o banca |
| Pro | Pagamento diretto telematico (se utente ha accesso Fisconline) |
| Contro | Complessità del formato, l'utente deve comunque caricarlo manualmente su Fisconline |
| Rischi | Format-specific, dipendenza da sistema bancario |
| **Raccomandazione** | Post-MVP — per ora PDF + istruzioni manuali è sufficiente |

### Opzione C: Solo istruzioni testuali (no PDF)

| Dimensione | Valutazione |
|---|---|
| Come | La piattaforma calcola e mostra a video i valori e i codici tributo. L'utente compila l'F24 a mano su home banking. |
| Pro | Semplice, nessun template PDF, zero manutenzione |
| Contro | L'utente deve trascrivere i valori (errore umano), esperienza povera |
| Rischi | Bassa soddisfazione utente |
| **Raccomandazione** | No — il PDF compilato è valore significativo |

### Decisione

**Opzione A**: PDF generato lato server con template conforme al modello F24 ordinario. Le istruzioni di pagamento accompagnano il PDF. Post-MVP: opzione B (file telematico) per chi vuole pagare via Fisconline.

---

## 6. Modello dati

### 6.1 Tabelle coinvolte

```
-- Da 00_architettura_e_decisioni.md:
f24_generati
  id (uuid, PK)
  tenant_id (uuid, FK)
  anno_riferimento (int)
  tipo (enum: 'saldo', 'acconto_1', 'acconto_2', 'unico', 'ravvedimento')
  data_scadenza (date)
  righe (jsonb)  -- [{sezione, codice_tributo, anno, importo, rateazione}]
  stato (enum: 'bozza', 'pronto', 'pagato')
  pdf_url (text, nullable)
  pagato_il (date, nullable)
  created_at (timestamptz)

scadenze
  id (uuid, PK)
  tenant_id (uuid, FK)
  tipo (enum: 'f24_saldo', 'f24_acconto_1', 'f24_acconto_2', 'dichiarazione', 'altro')
  data (date)
  importo_stimato (numeric, nullable)
  stato (enum: 'pendente', 'notificata', 'completata')
  f24_id (uuid, FK → f24_generati, nullable)  -- link dopo generazione
  created_at (timestamptz)

versamenti_storici
  id (uuid, PK)
  tenant_id (uuid, FK)
  anno (int)
  componente (enum: 'imposta_sostitutiva', 'contributi_inps')
  tipo (enum: 'saldo', 'acconto_1', 'acconto_2', 'unico')
  importo (numeric)
  data_versamento (date)
  f24_id (uuid, FK → f24_generati, nullable)
  created_at (timestamptz)
```

### 6.2 Struttura `f24_generati.righe` (JSONB)

```json
[
  {
    "sezione": "Erario",
    "codice_tributo": "1790",
    "anno_riferimento": "2025",
    "importo": 3714.98,
    "rateazione": null
  },
  {
    "sezione": "Erario",
    "codice_tributo": "1791",
    "anno_riferimento": "2026",
    "importo": 1485.99,
    "rateazione": "01"
  },
  {
    "sezione": "INPS",
    "codice_tributo": "P10",
    "anno_riferimento": "2025",
    "importo": 8733.45,
    "rateazione": null
  }
]
```

### 6.3 Invarianti

- `f24_generati` ha `tipo` + `anno_riferimento` + `tenant_id` univoco (un F24 per tipo/anno/tenant).
- `scadenze.data` è derivata dal `tipo` (30 giugno, 30 novembre).
- `versamenti_storici` viene popolato quando `f24_generati.stato` passa a 'pagato'.
- La somma delle righe per sezione Erario deve matchare il calcolo della Edge Function.

---

## 7. Logica e flussi

### 7.1 Flusso: generazione F24 saldo + acconto (giugno)

```
1. Trigger: scadenza 30 giugno si avvicina (avviso 15 giorni prima)
2. Edge Function calcola:
   a. Saldo imposta sostitutiva anno precedente (1790)
   b. 1° acconto imposta (50% se > 257,52, altrimenti unico a novembre)
   c. Saldo INPS anno precedente (PXX)
   d. 1° acconto INPS (50% o unico)
3. Genera righe F24 con codici tributo corretti
4. Genera PDF compilato → Storage Supabase
5. Crea record in f24_generati (stato='pronto')
6. Crea/aggiorna scadenze
7. Notifica utente: "Il tuo F24 di giugno è pronto"
8. Mostra istruzioni di pagamento
```

### 7.2 Flusso: generazione 2° acconto (novembre)

```
1. Trigger: scadenza 30 novembre
2. Edge Function calcola:
   a. 2° acconto imposta (50%) se acconto totale > 257,52
   b. 2° acconto INPS (50%) o unico se < 257,52
3. Genera F24 (solo righe acconto)
4. PDF → Storage
5. Notifica utente
```

### 7.3 Pseudocodice: calcolo F24

```
function generaF24(tenantId, annoSaldo, dataRiferimento) {
  // annoSaldo = anno del saldo (es. 2025), acconti = annoSaldo+1 (2026)
  const annoAcconto = annoSaldo + 1

  // 1. Calcola imposta e INPS dovuti per annoSaldo (dalla dichiarazione o previsione)
  const impostaAnnoSaldo = await calcolaImpostaSostitutiva(tenantId, annoSaldo)
  const inpsAnnoSaldo = await calcolaContributiINPS(tenantId, annoSaldo)

  // 2. Calcola acconti versati per annoSaldo (se già versati)
  const accontiVersati = await getAccontiVersati(tenantId, annoSaldo)
  const saldoImposta = impostaAnnoSaldo - accontiVersati.imposta
  const saldoINPS = inpsAnnoSaldo - accontiVersati.inps

  // 3. Calcola acconti per annoAcconto (metodo storico)
  const accontoTotaleImposta = impostaAnnoSaldo  // 100% anno precedente
  const accontoTotaleINPS = inpsAnnoSaldo

  // 4. Applica soglie e split 50/50
  const righe = []

  // SALDO Erario (1790)
  if (saldoImposta > 0)
    righe.push({sezione:'Erario', codice:'1790', anno: annoSaldo, importo: saldoImposta})

  // SALDO INPS (PXX)
  if (saldoINPS > 0)
    righe.push({sezione:'INPS', codice: getCodiceINPS(annoSaldo), anno: annoSaldo, importo: saldoINPS})

  // 1° ACCONTO imposta (50% a giugno, se > 257,52)
  if (accontoTotaleImposta > 257.52)
    righe.push({sezione:'Erario', codice:'1791', anno: annoAcconto, importo: accontoTotaleImposta * 0.50})

  // 1° ACCONTO INPS (50% a giugno, se > 257,52)
  if (accontoTotaleINPS > 257.52)
    righe.push({sezione:'INPS', codice: getCodiceINPS(annoAcconto), anno: annoAcconto, importo: accontoTotaleINPS * 0.50})

  return righe
}
```

### 7.4 Flusso: ravvedimento operoso

```
1. Utente indica: "Ho pagato in ritardo l'F24 di [data]"
2. Sistema calcola:
   a. Giorni di ritardo dalla scadenza originale
   b. Sanzione (base/200 per giorno se ≤14 giorni; 1/10 se 15-30; 1/9 se 31-90; 1/8 se 91-365)
   c. Interessi (tasso legale annuo × giorni / 365)
3. Genera F24 con:
   - Codice 1793 (sanzione)
   - Codice 1794 (interessi)
   - Codice originale (1790 o PXX) per l'importo originario
4. PDF + istruzioni
```

### 7.5 Istruzioni di pagamento (UI)

```
┌─────────────────────────────────────────────────────────┐
│ Il tuo F24 è pronto                                       │
│                                                          │
│ Totale da pagare: € XX.XXX,XX                             │
│ Scadenza: 30 giugno 2026                                  │
│                                                          │
│ Come pagare:                                              │
│ 1. Accedi al tuo home banking                             │
│ 2. Sezione "Pagamenti" → "F24"                            │
│ 3. Inserisci i seguenti codici tributo:                    │
│    • Erario — 1790 — Anno 2025 — € X.XXX,XX              │
│    • Erario — 1791 — Anno 2026 — € X.XXX,XX              │
│    • INPS — P10 — Anno 2025 — € X.XXX,XX                 │
│ 4. Conferma il pagamento                                  │
│ 5. Torna qui e segna come "Pagato"                        │
│                                                          │
│ [Scarica PDF] [Segna come pagato]                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Integrazioni & API

| Servizio | Endpoint | Scopo |
|---|---|---|
| Supabase Edge Function | `POST /functions/v1/genera-f24` | Calcolo + generazione PDF |
| Supabase Storage | Bucket `f24-pdf` | Salvataggio PDF generati |
| n8n (cron) | Workflow pre-scadenza | Alert email 15 e 7 giorni prima |
| Edge Function (previsione) | `calcolaPrevisione` | Riutilizzo calcoli fiscali |

---

## 9. Edge case & rischi

| Edge case | Impatto | Mitigazione |
|---|---|---|
| Acconto < 51,65 € | Non si versa | Non generare riga F24; mostrare "importo sotto soglia, non dovuto" |
| Impossibile calcolare saldo (dichiarazione precedente non presente) | F24 incompleto | Usare previsione come stima; marcare come "stimato"; consigliare di verificare |
| Codice INPS (PXX) cambia per anno | F24 errato | Tabella `dati_normativi` con codice INPS per anno; aggiornare annualmente |
| F24 pagato parzialmente | Saldo residuo | Permettere "pagamento parziale"; ricalcolare residuo |
| Rateizzazione attiva | Calcolo interessi complesso | Calcolo interessi = (importo × 4% / 12 × numero rate mensili); riga 1668 separata; riga 1668 separata |
| Utente esce dal forfettario a metà anno | Codici tributo non validi | Rilevare cambio regime da profilo fiscale; bloccare generazione F24 forfettario; mostrare alert |
| Ravvedimento oltre 1 anno | Sanzione massima | Avvisare che serve assistenza professionale |
| Doppio pagamento F24 | Eccedenza | Tracciare stato 'pagato'; se già pagato, avvisare; gestire eccedenze per compensazione anno successivo |
| Scadenza di sabato/domenica | Posticipata al lunedì | Calcolo data scadenza: se weekend, slittare al primo giorno lavorativo |

---

## 10. Compliance

| Aspetto | Dettaglio |
|---|---|
| Disclaimer | L'F24 generato è basato sui dati di fatturazione e sui parametri normativi vigenti. La responsabilità del versamento corretto resta al contribuente. Visualizzare disclaimer. |
| Codici tributo | Tabella `dati_normativi` con codici e `data_verifica`. Se un codice non è verificato, marcare come "da confermare". |
| Conservazione | PDF F24 archiviati in Supabase Storage (10 anni), copia scaricabile |
| Pagamento telematico | Non gestito dalla piattaforma. L'utente paga autonomamente. Nessuna credenziale bancaria memorizzata. |

---

## 11. Dipendenze

| Dipende da | Per cosa |
|---|---|
| Previsione tasse | Calcolo imposta sostitutiva + contributi INPS |
| Fatturazione elettronica | Dati di ricavo per il calcolo |
| `dati_normativi` | Codici tributo, tassi, soglie |
| Dichiarazione redditi (per anno precedente) | Calcolo saldo accurato (se dichiarazione compilata) |

| Alimenta | Come |
|---|---|
| Commercialista AI | Alert F24 in scadenza, ravvedimento suggerito |
| Scadenze / alert | Generazione automatica scadenze da F24 |
| Dichiarazione redditi | Versamenti storici per quadro corretto |

---

## 12. Domande aperte

| # | Domanda | Bloccante? |
|---|---|---|
| F24-001 | ~~Codice INPS esatto per Gestione Separata professionisti 2026 (P10? P01?)~~ **Risolta**: **P10** (sezione INPS del modello F24), copre saldo + 2 acconti; per rateizzazione si aggiunge "R" alla causale, per interessi da differimento si usa causale separata "DPPI" | No | Chiusa (11/07/2026) |
| F24-002 | ~~Codici tributo bollo virtuale: 2521-2524~~ **Risolta**: confermati (+ 2525 sanzioni, 2526 interessi) | No | Chiusa |
| F24-003 | ~~Tasso legale annuo 2026 per ravvedimento interessi~~ **Risolta**: **1,60%** dal 1/1/2026 (DM Economia 10/12/2025, G.U. 13/12/2025 n.289; in calo dal 2% del 2025) | No | Chiusa |
| F24-004 | Modello F24: ordinario o semplificato per il forfettario? | No (consiglio: ordinario, più completo) |
| F24-005 | Generazione PDF lato server: usare pdf-lib (Node/Deno) o un template precompilato? | No (scelta tecnica post-planning) |

---

## 13. Next step

1. ~~Verificare F24-001 (codice INPS 2026)~~ risolto: P10
2. ~~Verificare F24-003 (tasso legale 2026)~~ risolto: 1,60%
3. Progettare il template PDF dell'F24 ordinario
4. Implementare la Edge Function `generaF24` con tutti i casi (saldo, acconti, unico, ravvedimento)
5. Creare il cron n8n per alert pre-scadenza (15 e 7 giorni)
6. Testare con i dati reali del founder (anno 2025)
