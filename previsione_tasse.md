# Previsione Tasse

> **Progetto**: Piattaforma fiscale Neurora
> **Data**: 11 luglio 2026

---

## 1. Obiettivo

Dashboard che mostra in tempo reale quanto il forfettario dovrà versare (imposta sostitutiva + contributi INPS Gestione Separata) in base agli incassi effettivi. Ogni fattura emessa o ricevuta aggiorna istantaneamente il calcolo. Risponde alla domanda che ogni forfettario si pone: "quanto devo mettere da parte?".

**Per chi**: il founder (forfettario, 15%, multi-ATECO 67%), con estensione a tutti i forfettari nel SaaS futuro.

---

## 2. Ambito

### In scope
- Calcolo in tempo reale di: reddito imponibile, imposta sostitutiva (saldo + acconti), contributi INPS Gestione Separata (saldo + acconti)
- Dashboard con: fatturato cumulato YTD, reddito imponibile, imposta sostitutiva dovuta, contributi INPS dovuti, totale tasse, netto stimato
- Proiezione fine anno (basata su trend o input manuale)
- Soglia di allerta: avviso a 75k e 85k di fatturato
- Storico mensile (grafico)
- Scenari what-if ("se fatturo altri X, quanto pago?")

### Out of scope (MVP)
- Previsione per regimi non forfettari (semplificato, ordinario) — post-MVP
- Calcolo detrazioni 730 (fruibili, ma gestite separatamente)
- Previsione di tasse locali (IMU, TASI) — scope diverso
- Calcolo di casse professionali (il founder è in Gestione Separata)

---

## 3. Analisi normativa

### 3.1 Formula di calcolo del forfettario

```
Ricavi annui = Σ fatture attive (imponibile, data nell'anno)
Reddito imponibile = Ricavi × coefficiente_di_redditività
Contributi INPS = Reddito imponibile × aliquota_INPS (26,07%)
Reddito dopo contributi = Reddito imponibile − Contributi INPS
Imposta sostitutiva = Reddito dopo contributi × aliquota_sostitutiva (15%)
Totale tasse = Contributi INPS + Imposta sostitutiva
Netto stimato = Ricavi − Totale tasse
```

### 3.2 Parametri per il founder (verificati 07/2026)

| Parametro | Valore | Fonte |
|---|---|---|
| Coefficiente ATECO 59.20.3 | 67% | Tabella Agenzia Entrate — *da confermare per 2026* |
| Coefficiente ATECO 62.01.00 | 67% | Tabella Agenzia Entrate — *da confermare per 2026* |
| Aliquota imposta sostitutiva | 15% | Art. 1 c.54-89 L. 190/2014 (agevolazione 5% scaduta 2020) |
| Aliquota INPS Gestione Separata | 26,07% | INPS — forfettari.it (verificato 11/07/2026) |
| Aliquota INPS con altra copertura | 24% | Non applicabile (founder non ha altra copertura) |
| Massimale INPS 2026 | ~120.000 € | INPS — forfettari.it (verificato 11/07/2026); *verificare su circolare INPS* |
| Soglia ricavi forfettario | 85.000 € | Art. 1 c.54 L. 190/2014 |
| Soglia esclusione immediata | 100.000 € | Art. 1 c.57 L. 190/2014 |

### 3.3 Multi-ATECO: ripartizione del coefficiente

Il founder ha due codici ATECO (59.20.3 e 62.01.00), entrambi al 67%. Se i coefficienti fossero diversi, il calcolo sarebbe:

```
Reddito imponibile = Σ (ricavi_ateco_i × coeff_ateco_i)
```

Nel caso del founder (entrambi 67%), il coefficiente unico 67% si applica al totale. Il sistema deve però supportare il caso generale multi-ATECO con coefficienti diversi per il SaaS futuro.

### 3.4 Scadenze di versamento

| Scadenza | Cosa si versa | Quanto |
|---|---|---|
| 30 giugno (o 30 luglio con +0,40%) | Saldo imposta + Saldo INPS + 1° acconto (50%) | Saldo anno precedente + 50% acconto |
| 30 novembre | 2° acconto (50%) | 50% acconto imposta + INPS |

**Regole acconto**:
- Acconto < 51,65 € → non si versa
- Acconto 51,65-257,52 € → unica soluzione a novembre
- Acconto > 257,52 € → due rate (50% giugno, 50% novembre)
- Metodo storico: acconto = 100% versamenti anno precedente
- Metodo previsionale: acconto = 100% stimato anno corrente (se storico non affidabile)

> **Nota 1 — Primo anno**: nel primo anno di regime forfettario non è dovuto acconto (manca la base storica).
> **Nota 2 — Stima vs dichiarativo**: l'INPS maturato (reddito imponibile x aliquota) è una **stima previsionale** usata dalla dashboard. Nel Quadro LM della dichiarazione si deducono i contributi **effettivamente versati** nell'anno d'imposta (principio di cassa), non quelli maturati. Dove sono noti i versamenti reali (F24 pagati), usare quelli.

**Fonti**: calcoloforfettario.it (verificato 11/07/2026); forfettari.it (verificato 11/07/2026); Art. 1 c.54-89 L. 190/2014

### 3.5 Esempio numerico (founder)

```
Ricavi annui: 50.000 €
Coefficiente: 67%
Reddito imponibile: 50.000 × 0,67 = 33.500 €
Contributi INPS: 33.500 × 0,2607 = 8.733,45 €
Reddito dopo contributi: 33.500 − 8.733,45 = 24.766,55 €
Imposta sostitutiva: 24.766,55 × 0,15 = 3.714,98 €
Totale tasse: 8.733,45 + 3.714,98 = 12.448,43 €
Netto stimato: 50.000 − 12.448,43 = 37.551,57 €
Aliquota effettiva: 12.448,43 / 50.000 = 24,9%
```

---

## 4. Analisi concorrenti (per questa funzione)

| Concorrente | Previsione tasse | Come |
|---|---|---|
| Fatture in Cloud | No | Nessuna previsione in tempo reale per forfettari |
| Aruba | No | Solo monitoraggio fatturato per soglia 85k |
| Fattura24 | No | Nessuna previsione |
| Fiscozen | No (ma commercialista umano può calcolare) | Non automatizzato, oneroso |
| Agenzia Entrate | No | Solo strumenti dichiarativi post-facto |
| Strumenti gratuiti (calcoloforfettario.it) | Sì, ma statico | Calcolatore manuale, non integrato con fatture reali |

**Cosa possiamo fare meglio**: l'unica piattaforma che calcola in tempo reale dalle fatture effettive, con proiezione fine anno, alert su soglie e scenario what-if. Nessun concorrente integra fatturazione + previsione in un unico flusso.

---

## 5. Opzioni tecniche

### Opzione A: Calcolo lato frontend (client-side)

| Dimensione | Valutazione |
|---|---|
| Come | React calcola tasse in tempo reale dalle fatture caricate. Parametri fiscali letti da `dati_normativi` all'avvio. |
| Pro | Zero latenza, nessun costo API, aggiornamento istantaneo ad ogni nuova fattura |
| Contro | Logica di calcolo nel frontend (esposta), difficoltà di condivisione tra componenti |
| Rischi | Modifiche normative richiedono update frontend + DB |
| **Raccomandazione** | Sì per la dashboard, con parametri dal DB |

### Opzione B: Edge Function Supabase (server-side)

| Dimensione | Valutazione |
|---|---|
| Come | Edge Function calcola e restituisce previsione. Frontend chiama API. |
| Pro | Logica centralizzata, riusabile da n8n per alert email, testabile indipendentemente |
| Contro | Latenza di rete, costo per chiamata |
| Rischi | Rate limit Edge Functions |
| **Raccomandazione** | **Sì** — la logica di calcolo deve essere server-side per essere riusata dagli alert e dal F24 |

### Opzione C: Materializzazione in DB (view/trigger)

| Dimensione | Valutazione |
|---|---|
| Come | View PostgreSQL che calcola reddito/tasse aggregate. Trigger su insert fattura aggiorna tabella `riepilogo_fiscale`. |
| Pro | Calcolo sempre disponibile, zero codice applicativo, query SQL semplice |
| Contro | Complessità SQL, difficile debug, calcoli complessi (acconti, scadenze) non adatti a SQL puro |
| Rischi | Performance su grandi volumi (non un problema in single-tenant) |
| **Raccomandazione** | Parziale — view per aggregazioni semplici (fatturato YTD), Edge Function per calcoli complessi |

### Decisione

**Ibrido**: view PostgreSQL per aggregazioni veloci (fatturato cumulato per mese/anno), Edge Function per il calcolo fiscale completo (imposta, contributi, acconti, proiezioni). Frontend chiama l'Edge Function e mostra il risultato. n8n usa la stessa Edge Function per gli alert email.

---

## 6. Modello dati

### 6.1 Tabelle coinvolte

```
-- Da 00_architettura_e_decisioni.md:
fatture (imponibile, data, tipo, ateco_codice, tenant_id)
profili_fiscali (aliquota_sostitutiva, aliquota_inps, ateco_codici, tenant_id)
dati_normativi (chiave, valore, fonte_url, data_verifica, data_validita_da, data_validita_a)

-- Nuove:
previsioni_storiche
  id (uuid, PK)
  tenant_id (uuid, FK)
  anno (int)
  mese (int)
  fatturato_mese (numeric)
  fatturato_cumulato (numeric)
  reddito_imponibile (numeric)
  imposta_sostitutiva_dovuta (numeric)
  contributi_inps_dovuti (numeric)
  totale_tasse (numeric)
  netto_stimato (numeric)
  calcolato_at (timestamptz)
```

### 6.2 View di aggregazione

```sql
CREATE VIEW v_fatturato_ytd AS
SELECT
  tenant_id,
  EXTRACT(YEAR FROM data) AS anno,
  EXTRACT(MONTH FROM data) AS mese,
  ateco_codice,
  SUM(CASE WHEN tipo = 'attiva' THEN imponibile ELSE 0 END) AS ricavi_mese,
  SUM(CASE WHEN tipo = 'passiva' THEN imponibile ELSE 0 END) AS costi_mese
FROM fatture
GROUP BY tenant_id, EXTRACT(YEAR FROM data), EXTRACT(MONTH FROM data), ateco_codice;
```

### 6.3 Invarianti

- `previsioni_storiche` ha un record per `tenant_id + anno + mese`.
- I parametri in `dati_normativi` con `data_validita_a IS NULL OR data_validita_a >= CURRENT_DATE` sono quelli attivi.
- Se il fatturato cumulato supera 85.000, il sistema segnala (ma non cambia regime automaticamente — richiede verifica manuale).

---

## 7. Logica e flussi

### 7.1 Calcolo previsione (Edge Function)

```typescript
// Pseudocodice
function calcolaPrevisione(tenantId, anno, proiezioneFineAnno?) {
  // 1. Carica parametri fiscali attivi
  const profilo = await getProfiloFiscale(tenantId)
  const coeffAteco = profilo.ateco_codici // [{codice, coeff}]
  const aliquotaSostitutiva = profilo.aliquota_sostitutiva // 0.15
  const aliquotaINPS = profilo.aliquota_inps // 0.2607

  // 2. Carica fatture dell'anno
  const fatture = await getFattureAnno(tenantId, anno)
  const fattureAttive = fatture.filter(f => f.tipo === 'attiva')

  // 3. Calcola reddito imponibile (multi-ATECO)
  let redditoImponibile = 0
  for (const f of fattureAttive) {
    const coeff = coeffAteco.find(a => a.codice === f.ateco_codice)?.coeff ?? 0
    redditoImponibile += f.imponibile * coeff
  }

  // 4. Proiezione fine anno (se richiesta)
  if (proiezioneFineAnno) {
    const fatturatoAttuale = fattureAttive.reduce((s, f) => s + f.imponibile, 0)
    const fatturatoProiettato = fatturatoAttuale + proiezioneFineAnno
    redditoImponibile = fatturatoProiettato * coeffMedio
  }

  // 5. Calcola contributi INPS (con massimale)
  const massimale = await getDatoNormativo('massimale_inps_gestione_separata_2026')
  const redditoPerINPS = Math.min(redditoImponibile, massimale)
  const contributiINPS = redditoPerINPS * aliquotaINPS

  // 6. Calcola imposta sostitutiva (contributi sono deducibili)
  const redditoDopoContributi = redditoImponibile - contributiINPS
  const impostaSostitutiva = Math.max(0, redditoDopoContributi * aliquotaSostitutiva)

  // 7. Calcola acconti (metodo storico o previsionale)
  const versamentiAnnoPrecedente = await getVersamentiAnno(tenantId, anno - 1)
  const acconto = calcolaAcconto(versamentiAnnoPrecedente, redditoDopoContributi)

  return {
    fatturato: fattureAttive.reduce((s, f) => s + f.imponibile, 0),
    reddito_imponibile: redditoImponibile,
    contributi_inps: contributiINPS,
    imposta_sostitutiva: impostaSostitutiva,
    totale_tasse: contributiINPS + impostaSostitutiva,
    netto_stimato: redditoImponibile - contributiINPS - impostaSostitutiva,
    aliquota_effettiva: (contributiINPS + impostaSostitutiva) / fatturato,
    acconto: acconto, // {saldo, acconto_1_50, acconto_2_50, unico}
    prossima_scadenza: getProssimaScadenza(),
  }
}
```

### 7.2 Dashboard: componenti

```
┌─────────────────────────────────────────────────────────┐
│ Dashboard Previsione Tasse                                │
├─────────────────┬─────────────────┬─────────────────────┤
│ Fatturato YTD   │ Reddito Imponibile│ Totale Tasse        │
│ € XX.XXX,XX     │ € XX.XXX,XX      │ € XX.XXX,XX (XX%)  │
├─────────────────┴─────────────────┴─────────────────────┤
│ [Grafico: fatturato mensile vs tasse cumulate]            │
├─────────────────────────────────────────────────────────┤
│ Prossimi versamenti:                                      │
│ • 30 giugno: Saldo €X + 1° acconto €Y = €Z               │
│ • 30 novembre: 2° acconto €W                              │
├─────────────────────────────────────────────────────────┤
│ Scenario what-if: [+ €10.000] → tasse +€X, netto +€Y    │
├─────────────────────────────────────────────────────────┤
│ Allerta: fatturato a €75.000 (90% soglia) — attenzione    │
└─────────────────────────────────────────────────────────┘
```

### 7.3 Flusso: aggiornamento a nuova fattura

```
1. Utente crea/invia fattura attiva
2. Trigger DB → insert in fatture
3. Frontend invalida cache previsione
4. Frontend chiama Edge Function calcolaPrevisione(anno)
5. Dashboard si aggiorna con nuovi totali
6. Se fatturato cumulato > soglia alert (75k/85k), genera alert
7. n8n (cron settimanale) chiama stessa Edge Function → email di riepilogo
```

---

## 8. Integrazioni & API

| Servizio | Endpoint | Scopo |
|---|---|---|
| Supabase Edge Function | `POST /functions/v1/calcola-previsione` | Calcolo fiscale |
| Supabase View | `v_fatturato_ytd` | Aggregazione veloce per grafici |
| n8n (cron) | Workflow settimanale | Alert email riepilogo tasse |
| Dati normativi | Tabella `dati_normativi` | Parametri fiscali con fonti |

---

## 9. Edge case & risi

| Edge case | Impatto | Mitigazione |
|---|---|---|
| Fatturato cumulato supera 85.000 € | Perdita regime forfettario | Alert a 75k (preavviso) e 85k. Il sistema non cambia regime automaticamente, avvisa l'utente di consultare un professionista |
| Fatturato cumulato supera 100.000 € | Perdita immediata regime | Alert critico, calcolo non più applicabile (passare a semplificato) |
| Massimale INPS raggiunto (~120k reddito) | Contributi INPS non crescono oltre | Calcolo ferma contributi al massimale (praticamente impossibile con soglia 85k e coeff 67%) |
| Anno di apertura = anno corrente (agevolazione 5%) | Aliquota 5% invece di 15% | `profilo_fiscale.aliquota_sostitutiva` derivata da `data_apertura_piva` |
| Reddito imponibile negativo (note credito > fatture) | Imposta sostitutiva negativa | Math.max(0, ...) sull'imposta; segnalare anomalia |
| Cambio coefficiente ATECO durante l'anno | Calcolo retroattivo errato | `dati_normativi` con `data_validita_da/a`; calcolo usa il coefficiente valido alla data della fattura |
| Acconto < 51,65 € | Non si versa | Logica nel calcolo acconti: se sotto soglia, non generare riga F24 |
| Multi-ATECO con coefficienti diversi | Calcolo errato se applicato coefficiente unico | Ripartizione per codice ATECO (case del founder: entrambi 67%, ma il sistema gestisce caso generale) |
| Proiezione fine anno irrealistica | Stima fuorviante | Permettere solo proiezioni con input manuale o trend basato su mesi passati; marcare come "stimato" |
| Fattura datata in anno precedente | Calcolo YTD errato | Filtrare sempre per `EXTRACT(YEAR FROM data) = anno_corrente` |

---

## 10. Compliance

| Aspetto | Dettaglio |
|---|---|
| Disclaimer | La previsione è una stima basata sui dati di fatturazione e sui parametri normativi vigenti. Non sostituisce la dichiarazione ufficiale. Visualizzare disclaimer in dashboard. |
| Fonti | Ogni parametro in `dati_normativi` ha `fonte_url` e `data_verifica`. La dashboard può mostrare "Parametri verificati il [data] su [fonte]" |
| GDPR | Nessun dato personale aggiuntivo; usa dati di fatturazione già presenti |

---

## 11. Dipendenze

| Dipende da | Per cosa |
|---|---|
| Fatturazione elettronica | Fatture = dati di input per il calcolo |
| Profilo fiscale del tenant | ATECO, aliquote, data apertura |
| `dati_normativi` popolata | Parametri fiscali verificati |

| Alimenta | Come |
|---|---|
| Generazione F24 | Previsione → calcolo saldo/acconti → righe F24 |
| Commercialista AI | Contesto per alert ("sei a X euro dalla soglia") |
| Dichiarazione redditi | Dati aggregati per compilazione quadro |

---

## 12. Domande aperte

| # | Domanda | Bloccante? |
|---|---|---|
| PT-001 | ~~Coefficiente ATECO 59.20.3 = 67%?~~ **Risolto**: confermato (allegato 2 L.190/2014) | No | Chiusa |
| PT-002 | ~~Coefficiente ATECO 62.01.00 = 67%?~~ **Risolto**: confermato (allegato 2 L.190/2014) | No | Chiusa |
| PT-003 | ~~Massimale INPS 2026?~~ **Risolto**: non rilevante per forfettario (reddito max ~56.950 € sotto massimale) | No | Chiusa |
| PT-004 | ~~Soglia reddito dipendente: 30k o 35k?~~ **Risolto**: 35.000 € per 2026 (L.190/2014 aggiornata) | No | Chiusa |
| PT-005 | ~~Metodo acconto default: storico o previsionale?~~ **Risolta**: storico come default (100% versamenti anno precedente), previsionale solo per primo anno di attività o su scelta esplicita dell'utente → D-020 | No | Chiusa (11/07/2026) |

---

## 13. Next step

1. ~~Verificare PT-001 e PT-002~~ (risolti: 67% confermato)
2. Popolare `dati_normativi` con i parametri verificati
3. Progettare la Edge Function `calcolaPrevisione`
4. Prototipare la dashboard (componenti React + Tailwind)
5. Configurare il cron n8n per alert settimanali
6. Definire i test del calcolo con casi numerici noti (es. 50k → 12.448 €)
