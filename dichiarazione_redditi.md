# Dichiarazione dei Redditi

> **Progetto**: Piattaforma fiscale Neurora
> **Data**: 11 luglio 2026

---

## 1. Obiettivo

Compilare e preparare il Modello Redditi PF per un forfettario, pre-compilando i quadri rilevanti dai dati di fatturazione e calcoli fiscali già presenti in piattaforma. La piattaforma **prepara** la dichiarazione e fornisce le istruzioni per l'invio telematico; **non trasmette** la dichiarazione (vedi §3.1 per i vincoli legali).

**Per chi**: il founder (forfettario), che trasmette la propria dichiarazione via Fisconline con SPID/CIE/CNS.

---

## 2. Ambito

### In scope
- Pre-compilazione del Modello Redditi PF (quadri rilevanti per forfettario)
- Generazione del file telematico pronto per l'invio (formato . redditi PF)
- Istruzioni passo-passo per l'invio via Fisconline
- Calcolo automatico di imposta sostitutiva, contributi INPS, acconti
- Quadro RW (monitoraggio di attività e investimenti esteri, se applicabile — *verificare*)
- Storico dichiarazioni
- Verifica di coerenza: totale fatture vs totale dichiarato

### Out of scope (MVP)
- **Invio telematico per conto di terzi** — riservato a intermediari abilitati (art. 3 c.3 DPR 322/1998)
- Modello 730 (il forfettario può usare 730 o Redditi; per semplicità MVP = Redditi PF)
- Dichiarazione per regimi non forfettari
- Visto di conformità (richiede intermediario abilitato)
- Compilazione di quadri non rilevanti per il forfettario (es. quadro RP, RM se non applicabili)

---

## 3. Analisi normativa

### 3.1 Invio telematico: vincolo fondamentale

| Caso | Chi può trasmettere | Norma |
|---|---|---|
| **Per la propria P.IVA** | Il contribuente stesso, via Fisconline con SPID/CIE/CNS | Art. 3 c.1 DPR 322/1998 |
| **Per conto di terzi** | Solo intermediari abilitati: commercialisti, CAF, altri professionisti iscritti ad albi | Art. 3 c.3 DPR 322/1998 |

**La piattaforma Neurora NON è un intermediario abilitato.** Non può trasmettere dichiarazioni per conto degli utenti (nel caso SaaS). Per il founder (dichiarazione per sé), la piattaforma può preparare il file e l'utente lo trasmette autonomamente via Fisconline.

**Per il SaaS futuro**: due opzioni:
1. La piattaforma prepara e l'utente trasmette autonomamente (come il founder).
2. Partnership con un intermediario abilitato (commercialista) che trasmette per conto degli utenti — cambia il modello di business e la compliance.

**Decisione**: MVP = opzione 1 (preparazione + istruzioni per invio autonomo). SaaS futuro = opzione 1 di default, opzione 2 come add-on premium (richiede analisi legale separata).

**Fonte**: Art. 3 c.1 e c.3, DPR 322/1998 (Normattiva)

### 3.2 Visto di conformità

| Quando serve | Chi lo appone |
|---|---|
| Per dichiarazioni trasmesse da intermediari | Commercialisti iscritti all'Albo, CAF dipendenti e iscritti |
| Per trasmissione autonoma del contribuente | Non necessario (il contribuente trasmette senza visto) |

Il forfettario che trasmette da solo NON ha bisogno del visto di conformità. La piattaforma non lo appone né lo simula.

### 3.3 Modello Redditi PF: quadri rilevati per forfettario

| Quadro | Cosa contiene | Compilazione |
|---|---|---|
| **Frontespizio** | Dati anagrafici, regime fiscale, codice attività | Dati del profilo fiscale |
| **Quadro LM** | Redditi di lavoro autonomo in regime forfettario (mod. SM) | Ricavi × coefficiente, contributi INPS dedotti, imposta sostitutiva |
| **Quadro RW** | Monitoraggio di attività e investimenti esteri (se applicabile) | *Verificare se il founder ha attività estere — probabile no* |
| **Quadro RN** | Ricalcolo IRPEF (ma il forfettario non paga IRPEF — serve per scudo anti-elusivo?) | *Da verificare — probabilmente non compilato nel caso standard* |
| **Quadro RS** | Detrazioni e crediti d'imposta (se applicabili) | *Verificare caso per caso* |
| **Quadro CU** | Certificazione unica (dati already dai sostituiti d'imposta) | *Non applicabile se il founder non ha sostituti d'imposta* |

> **Nota**: il quadro centrale per il forfettario è il **Quadro LM** (redditi lavoro autonomo, regime forfettario). La compilazione è relativamente semplice rispetto a un Modello Redditi completo per regime ordinario.

**Fonte**: Istruzioni Modello Redditi PF 2026 (Agenzia delle Entrate) — *da verificare con le istruzioni ufficiali dell'anno di competenza*

### 3.4 Scadenza Modello Redditi

| Adempimento | Scadenza | Note |
|---|---|---|
| Invio Modello Redditi PF | 2 novembre 2026 (31/10 cade di sabato, slitta al primo lunedì) | Termine ordinario 31 ottobre; slitta per festivo |
| Pagamento saldo + 1° acconto | 30 giugno (o 30 luglio con +0,40%) | Allineato con F24 |

### 3.5 730 vs Redditi PF

Il forfettario può usare entrambi. Il 730 è più semplice ma:
- Richiede un sostituto d'imposta (datore di lavoro) per conguaglio — il forfettario senza dipendenti non ce l'ha.
- Il 730 è più limitato per alcune tipologie di reddito.

Per il founder (nessun sostituto d'imposta), il Modello Redditi PF è l'opzione corretta.

---

## 4. Analisi concorrenti (per questa funzione)

| Concorrente | Dichiarazione | Come |
|---|---|---|
| Fatture in Cloud | No | Non gestisce dichiarativi |
| Aruba | No | Non gestisce dichiarativi |
| Fattura24 | No | Non gestisce dichiarativi |
| Fiscozen | Sì (commercialista umano) | Include dichiarazione nel servizio 499 €/anno — il commercialista compila e trasmette |
| TeamSystem | Sì (modulo dichiarativi) | Enterprise, costoso |
| Agenzia Entrate | Sì (software gratuito + Fisconline) | Compilazione manuale, UX complessa, nessuna pre-compilazione da dati di fatturazione |

**Cosa possiamo fare meglio**: pre-compilazione automatica del Quadro LM dai dati di fatturazione già in piattaforma, calcolo automatico di imposta e contributi, generazione del file telematico pronto, istruzioni guidate per l'invio. Tra il "fai da te" dell'Agenzia (complesso) e il "fai fare" di Fiscozen (costoso), Neurora offre il "fai con l'AI che pre-compila per te" a costo near-zero.

---

## 5. Opzioni tecniche

### Opzione A: Pre-compilazione dati + export file telematico

| Dimensione | Valutazione |
|---|---|
| Come | Edge Function raccoglie dati di fatturazione, calcola reddito/imposta/contributi, genera il file telematico del Modello Redditi PF (formato ufficiale). L'utente scarica e trasmette via Fisconline. |
| Pro | Entro i vincoli legali (nessuna trasmissione per terzi), massimo valore per l'utente |
| Contro | Formato file telematico complesso (specifiche AdE), da aggiornare annualmente |
| Rischi | Formato cambia ogni anno — manutenzione necessaria |
| **Raccomandazione** | **Sì** — è l'opzione corretta |

### Opzione B: Solo pre-compilazione a video (no file telematico)

| Dimensione | Valutazione |
|---|---|
| Come | La piattaforma mostra a video i valori pre-compilati per ogni quadro. L'utente li trascrive nel software AdE o in Fisconline. |
| Pro | Semplice, nessuna dipendenza dal formato telematico |
| Contro | L'utente deve trascrivere (errore umano), esperienza povera |
| Rischi | Bassa soddisfazione |
| **Raccomandazione** | Fallback se la generazione del file telematico è troppo complessa |

### Opzione C: Integrazione con Fisconline (trasmissione automatica)

| Dimensione | Valutazione |
|---|---|
| Come | API Fisconline per invio diretto. La piattaforma trasmette per conto dell'utente. |
| Pro | Esperienza "un clic" |
| Contro | **Illegale per il SaaS** (intermediari abilitati); per il founder singolo richiede credenziali SPID in piattaforma (rischio security) |
| Rischi | Legale (per SaaS), security (credenziali SPID) |
| **Raccomandazione** | **No** — illegale per il caso SaaS, e per il founder singolo è meglio usare Fisconline manualmente |

### Decisione

**Opzione A**: pre-compilazione dati + generazione file telematico pronto. L'utente trasmette via Fisconline. Se la generazione del file telematico è troppo complessa nel primo ciclo, fallback a Opzione B (pre-compilazione a video) come step intermedio.

---

## 6. Modello dati

### 6.1 Tabelle coinvolte

```
-- Da 00_architettura_e_decisioni.md:
dichiarazioni_redditi
  id (uuid, PK)
  tenant_id (uuid, FK)
  anno_imposta (int)
  stato (enum: 'bozza', 'precompilata', 'pronta', 'inviata_manualmente')
  quadri (jsonb)  -- {frontespizio: {...}, LM: {...}, RW: {...}, ...}
  pdf_url (text, nullable)
  file_telematico_url (text, nullable)  -- file .redditiPF o equivalente
  inviata_il (date, nullable)
  note (text, nullable)
  created_at (timestamptz)
  updated_at (timestamptz)

fatture (per dati di input)
f24_generati (per versamenti storici)
versamenti_storici (per acconti)
profili_fiscali (per regime, ATECO, aliquote)
```

### 6.2 Struttura `dichiarazioni_redditi.quadri` (JSONB)

```json
{
  "frontespizio": {
    "codice_fiscale": "PNTDVD88L28F052K",
    "denominazione": "PANTALEO DAVIDE",
    "codice_attivita": "59.20.3",
    "regime_fiscale": "RF19",
    "data_nascita": "1988-07-28",
    "comune_nascita": "MATERA",
    "sede": { "comune": "CILAVEGNA", "provincia": "PV", "via": "VIA VERNAZZOLA 11/C", "cap": "27024" }
  },
  "LM": {
    "ricavi_totali": 50000.00,
    "codice_ateco": "59.20.3",
    "coefficiente_redditivita": 0.67,
    "reddito_imponibile": 33500.00,
    "contributi_inps_dedotti": 8733.45,  // per cassa: versamenti effettivi, non maturati
    "reddito_dopo_contributi": 24766.55,
    "imposta_sostitutiva": 3714.98,
    "aliquota": 0.15,
    "acconto_imposta": 3714.98,
    "acconto_inps": 8733.45
  },
  "RW": null,
  "stato_visto_conformita": "non_richiesto"
}
```

### 6.3 Invarianti

- Una dichiarazione per `tenant_id + anno_imposta`.
- `stato` transizione: `bozza → precompilata → pronta → inviata_manualmente`.
- I totali in `quadri.LM` devono matchare i calcoli della Edge Function di previsione tasse.
- `inviata_il` si popola solo quando l'utente conferma l'invio manuale.

---

## 7. Logica e flussi

### 7.1 Flusso: pre-compilazione dichiarazione

```
1. Trigger: utente seleziona "Prepara dichiarazione [anno]"
2. Edge Function raccoglie:
   a. Dati anagrafici dal profilo fiscale → frontespizio
   b. Fatture attive dell'anno → ricavi totali
   c. Ripartizione multi-ATECO → reddito imponibile per coefficiente
   d. Contributi INPS calcolati → deduzione
   e. Imposta sostitutiva calcolata
   f. Versamenti storici (acconti già versati)
3. Compila quadro LM
4. Verifica coerenza: Σ fatture attive = ricavi totali dichiarati
5. Verifica quadri aggiuntivi (RW se attività estere — flag da profilo)
6. stato = 'precompilata'
7. Mostra all'utente per revisione
8. Utente conferma → genera file telematico → stato = 'pronta'
9. Istruzioni per invio Fisconline
```

### 7.2 Flusso: invio manuale (istruzioni UI)

```
┌─────────────────────────────────────────────────────────┐
│ La tua dichiarazione è pronta per l'invio                │
│                                                          │
│ File: Redditi_PF_2026_PNTDVD88L28F052K.zip (pronto)       │
│ Scadenza invio: 2 novembre 2026 (31/10 cade di sabato)                           │
│                                                          │
│ Come inviare:                                             │
│ 1. Scarica il file telematico                             │
│ 2. Accedi a Fisconline (Agenzia delle Entrate) con SPID   │
│ 3. Vai a "Dichiarazioni" → "Invio telematico Redditi PF"  │
│ 4. Carica il file scaricato                               │
│ 5. Verifica le ricevute: accettazione / scarto            │
│ 6. Torna qui e segna come "Inviata"                       │
│                                                          │
│ [Scarica file] [Segna come inviata] [Guida Fisconline]    │
└─────────────────────────────────────────────────────────┘
```

### 7.3 Pseudocodice: compilazione Quadro LM

```
function compilaQuadroLM(tenantId, anno) {
  const profilo = await getProfiloFiscale(tenantId)
  const fatture = await getFattureAttiveAnno(tenantId, anno)

  // Ripartizione multi-ATECO
  let ricaviPerAteco = {}
  for (const f of fatture) {
    ricaviPerAteco[f.ateco_codice] = (ricaviPerAteco[f.ateco_codice] ?? 0) + f.imponibile
  }

  // Calcolo reddito imponibile
  let redditoImponibile = 0
  for (const [codice, ricavi] of Object.entries(ricaviPerAteco)) {
    const coeff = profilo.ateco_codici.find(a => a.codice === codice)?.coeff ?? 0
    redditoImponibile += ricavi * coeff
  }

  // Contributi INPS deducibili: principio di CASSA (versati nell'anno d'imposta)
  // NON usare il teorico maturato (reddito × aliquota) — leggere i versamenti reali
  // dai movimenti_contabili (tipo='contributo') o f24_generati (stato='pagato')
  const contributiINPS = await getContributiVersatiAnno(tenantId, anno)
  // = saldo INPS anno precedente (pagato a giugno dell'anno corrente)
  //   + acconti INPS pagati nell'anno corrente (giugno + novembre)

  // Imposta sostitutiva
  const redditoDopoContributi = redditoImponibile - contributiINPS
  const impostaSostitutiva = Math.max(0, redditoDopoContributi * profilo.aliquota_sostitutiva)

  // Acconti per anno successivo (metodo storico: 100% versamenti anno precedente)
  const accontoImposta = impostaSostitutiva
  const accontoINPS = contributiINPS  // contributi effettivamente versati

  return {
    ricavi_totali: fatture.reduce((s, f) => s + f.imponibile, 0),
    codice_ateco: profilo.ateco_codici[0].codice, // prevalente
    coefficiente_redditivita: profilo.ateco_codici[0].coeff,
    reddito_imponibile: redditoImponibile,
    contributi_inps_dedotti: contributiINPS,
    reddito_dopo_contributi: redditoDopoContributi,
    imposta_sostitutiva: impostaSostitutiva,
    aliquota: profilo.aliquota_sostitutiva,
    acconto_imposta: accontoImposta,
    acconto_inps: accontoINPS,
  }
}
```

---

## 8. Integrazioni & API

| Servizio | Endpoint | Scopo |
|---|---|---|
| Supabase Edge Function | `POST /functions/v1/compila-dichiarazione` | Pre-compilazione quadri |
| Supabase Edge Function | `POST /functions/v1/genera-file-telematico` | Generazione file Redditi PF |
| Supabase Storage | Bucket `dichiarazioni` | File telematici e PDF |
| Agenzia Entrate (esterno, manuale) | Fisconline | Invio telematico da parte dell'utente |

---

## 9. Edge case & rischi

| Edge case | Impatto | Mitigazione |
|---|---|---|
| Fatture di dicembre registrate a gennaio anno successivo | Ricavi attribuiti all'anno sbagliato | Filtrare sempre per `data` della fattura, non per data di registrazione |
| Nota di credito emessa dopo la chiusura dell'anno | Rettifica necessaria | Permettere rettifica dichiarazione pre-invio; se già inviata, nota integrativa |
| ATECO secondario non in profilo | Reddito imponibile errato | Validazione: ogni fattura deve avere `ateco_codice` presente nel profilo |
| Utente vuole trasmettere via intermediario | La piattaforma non trasmette | Guidare l'utente all'export PDF per il commercialista; non simulare invio |
| Formato file telematico cambia annualmente | File non valido | `dati_normativi` con versione formato; aggiornare annualmente; fallback a pre-compilazione a video |
| Dichiarazione integrativa dopo invio | Ripetizione del processo | Permettere "clona dichiarazione" e modifica |
| Attività estere (RW) non dichiarate | Sanzione | Questionario all'utente: "Hai attività estere?" → se sì, abilitare quadro RW |
| Controllo coerenza fallisce (fatture ≠ dichiarato) | Dati incongruenti | Bloccare pre-compilazione; mostrare discrepanze; richiedere verifica |
| Cambio di regime durante l'anno | Quadro LM non più applicabile | Rilevare cambio regime; avvisare che serve dichiarazione per regime diverso |

---

## 10. Compliance

| Aspetto | Dettaglio |
|---|---|
| **Limite legale** | La piattaforma NON trasmette dichiarazioni per conto di terzi. Prepara il file e fornisce istruzioni. L'invio è responsabilità del contribuente. Disclaimer esplicito. |
| **Visto di conformità** | Non apposto, non simulato. Non necessario per trasmissione autonoma. |
| **AI Act** | Se l'AI assiste nella compilazione, deve essere trasparente: "compilazione assistita da AI, verifica i dati prima dell'invio". L'utente è responsabile del contenuto. |
| **GDPR** | Dati fiscali = categoria delicata. Base giuridica: esecuzione contratto. File telematici in Storage con access control. |
| **Conservazione** | File telematici e ricevute di invio conservati 10 anni. |
| **Disclaimer** | "La pre-compilazione è basata sui dati di fatturazione in piattaforma. La responsabilità della dichiarazione corretta e del suo invio tempestivo spetta al contribuente. Non sostituisce la consulenza di un professionista abilitato." |

---

## 11. Dipendenze

| Dipende da | Per cosa |
|---|---|
| Fatturazione elettronica | Fatture = dati per il calcolo dei ricavi |
| Previsione tasse | Calcolo imposta, contributi, acconti |
| Generazione F24 | Versamenti storici per controllo coerenza |
| Profilo fiscale | ATECO, aliquote, regime |
| `dati_normativi` | Coefficienti, codici, formato file telematico |

| Alimenta | Come |
|---|---|
| Generazione F24 (anno successivo) | Acconti calcolati nella dichiarazione alimentano l'F24 di giugno |
| Commercialista AI | Contesto per Q&A ("come compilo il quadro LM?") |
| Storico | Per confronto anno su anno |

---

## 12. Domande aperte

| # | Domanda | Bloccante? |
|---|---|---|
| DR-001 | Formato file telematico Redditi PF 2026: specifiche tecniche ufficiali? | No (verificabile su AdE) |
| DR-002 | Scadenza invio Redditi PF 2026: 31 ottobre o 30 novembre? | **Risolta**: 2 novembre 2026 (31/10 sabato, slitta a lunedì) |
| DR-003 | Quadro RW necessario per il founder? (attività estere?) | No (chiedere al founder) |
| DR-004 | Per il SaaS: partnership con intermediario abilitato per trasmissione? | No (decisione futura) |
| DR-005 | ~~Generare file telematico in MVP o solo pre-compilazione a video?~~ **Risolta**: solo pre-compilazione a video + PDF nel MVP; file telematico ufficiale rimandato (richiede specifiche Entratel/Fisconline più complesse, DR-001) → D-021 | No | Chiusa (11/07/2026) |
| DR-006 | Il forfettario deve compilare quadro RN (ricalcolo IRPEF) o solo LM? | No (verificare sulle istruzioni) |

---

## 13. Next step

1. Scaricare le istruzioni ufficiali del Modello Redditi PF 2026 dall'Agenzia delle Entrate
2. Verificare DR-001 (specifiche formato file telematico)
3. Studiare il quadro LM in dettaglio (campi, righe, codici)
4. ~~Decidere DR-005~~ risolto: solo pre-compilazione a video + PDF nel MVP
5. Progettare l'Edge Function `compilaDichiarazione`
6. Creare il questionario per quadri opzionali (RW, RS)
7. Implementare le istruzioni guidate per Fisconline
