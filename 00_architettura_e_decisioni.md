# 00 — Architettura e Decisioni (documento master)

> **Progetto**: Piattaforma fiscale Neurora (nome provvisorio)
> **Founder**: Davide Pantaleo — Neurora
> **Data**: 11 luglio 2026
> **Fase**: Planning (nessun codice)

---

## 1. Visione

Costruire una piattaforma fiscale proprietaria che copra l'intero ciclo di vita della Partita IVA in regime forfettario: fatturazione elettronica, previsione tasse in tempo reale, generazione F24, dichiarazione dei redditi e un "commercialista AI" proattivo sempre aggiornato. L'obiettivo è sostituire Fatture in Cloud per le esigenze del founder e, in prospettiva, trasformare il prodotto in un SaaS per altri forfettari, con l'AI come fattore differenziante.

**Posizionamento**: "Il gestionale fiscale che pensa per te" — automazione proattiva, trasparenza delle fonti, zero scartoffie. Non un software passivo, ma un assistente che monitora, calcola, avverte.

---

## 2. Scope deciso in Fase 0

### 2.1 Perimetro

| Dimensione | Decisione | Note |
|---|---|---|
| Tenant | **Single-tenant** ora, **architettura multi-tenant-ready** | Progettata per diventare SaaS; il data model include `tenant_id` fin dal giorno 1 |
| Target SaaS (futuro) | Forfettari individuali | Se esteso a semplificati, serve un'onda di lavoro sul motore di calcolo |
| Utente iniziale | Davide Pantaleo | P.IVA 01287030777, CF PNTDVD88L28F052K |

### 2.2 Profilo fiscale del founder

| Dato | Valore | Fonte |
|---|---|---|
| Partita IVA | 01287030777 | Visura Camerale (09/08/2024) |
| Codice Fiscale | PNTDVD88L28F052K | Visura Camerale |
| Forma giuridica | Impresa individuale (piccolo imprenditore, sezione speciale) | Visura Camerale |
| Data inizio attività | 01/04/2015 | Visura Camerale |
| Data iscrizione RI | 09/06/2015 | Visura Camerale |
| Sede | Cilavegna (PV), Via Vernazzola 11/c, 27024 | Confermato dal founder |
| PEC | drylandstudio@pec.it | Visura Camerale |
| REA | MT - 87391 (da verificare su visura aggiornata) | Confermato dal founder (REA da verificare) |
| ATECO prevalente | 59.20.3 — studi di registrazione sonora | Visura Camerale |
| ATECO secondario | 62.01.00 — attività di elaborazione dati, ecc. | Dichiarazione founder (non in visura, da confermare con visura aggiornata) |
| Coefficiente redditività | 67% per entrambi i codici | Tabella ufficiale Agenzia Entrate — *da confermare per 2026* |
| Regime | Forfettario | Confermato dal founder |
| Aliquota imposta sostitutiva | **15%** (l'agevolazione 5% è scaduta nel 2020, 5 anni dal 2015) | Art. 1 c. 54-89 L. 190/2014 |
| Contributi INPS | Gestione Separata, aliquota 26,07% | Nessuna cassa professionale |
| Altri contributi | Nessuno | Confermato dal founder |
| Reddito dipendente parallelo | Nessuno | Confermato dal founder |

### 2.3 Decisioni di scoping

| # | Domanda | Risposta | Impatto |
|---|---|---|---|
| A1 | Single-tenant o SaaS? | Single-tenant ora, SaaS-ready | `tenant_id` ovunque, RLS policies Supabase |
| A2 | Target SaaS | Forfettari | Motori di calcolo tarati su forfettario |
| C1 | Provider SDI | Da raccomandare (vedi §6) | Raccomandazione: vedi `fatturazione_elettronica.md` |
| C2 | Budget infrastrutturale | ~100 €/anno | Vincolo forte sulla scelta provider |
| D1 | Dichiarazione redditi | Pre-compilazione + istruzioni (no invio telematico) | Vincolo legale: l'invio per conto di terzi è riservato a intermediari abilitati |
| D2 | F24 | Generazione del modello + istruzioni di pagamento (no pagamento telematico via API banca in MVP) | L'utente paga via home banking / F24 web |
| D3 | Commercialista AI | Q&A con RAG + funzioni proattive (alert email, monitoraggio scadenze) | Richiede job scheduler + integrazione LLM + fonti RAG |
| E1 | Priorità MVP | Definita dal lead | Vedi roadmap §8 |
| E3 | Migrazione FiC | Clonazione (no cancellazione su FiC) | API FiC → insert locale; FiC resta attivo |
| F1 | Colori | Palette Neurora | Gradient `135deg,#06B6D4,#6366F1,#EC4899`, accent `#2B4FFF` |
| F2 | Nome | Da definire | Placeholder: "Neurora Fiscale" |

---

## 3. Architettura d'insieme

### 3.1 Diagramma dei componenti (testuale)

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React 18 + Vite)             │
│  Dashboard │ Fatture │ F24 │ Previsione │ Chat AI │ Settings│
└────────────────────────┬────────────────────────────────┘
                         │ REST/Supabase JS client
┌────────────────────────┴────────────────────────────────┐
│                    Supabase (PostgreSQL + Auth + Storage)  │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ tenants  │ │ fatture  │ │ movimenti │ │ dichiarazioni  │  │
│  │ profili  │ │ clienti  │ │ f24       │ │ quadri_redditi │  │
│  │ fiscali  │ │ fornitori│ │ scadenze  │ │ chat_sessions  │  │
│  └─────────┘ └─────────┘ └──────────┘ └────────────────┘  │
│  RLS: tenant_id isolation │ Edge Functions │ Storage XML/PDF│
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────┴───────┐ ┌─────┴──────┐ ┌──────┴───────┐
│  Provider SDI  │ │  LLM + RAG  │ │  n8n (cron)  │
│  (API REST)    │ │  (Supabase  │ │  Hostinger   │
│  Invio/ricez.  │ │  pgvector)  │ │  Alert email │
│  Conservazione │ │             │ │  Scadenze    │
└────────────────┘ └────────────┘ └──────────────┘
         │
┌────────┴───────┐
│  Fatture in     │
│  Cloud API      │
│  (migrazione    │
│  one-time)      │
└────────────────┘
```

### 3.2 Principi architetturali

1. **Multi-tenant-ready dal giorno 1**: ogni tabella ha `tenant_id`, ogni policy RLS filtra per `tenant_id`. Anche in single-tenant c'è un solo tenant attivo, ma il passaggio a SaaS è uno switch, non un refactor.
2. **Fonti verificate, non memoria**: ogni dato normativo (aliquota, codice tributo, scadenza) è memorizzato in tabella `dati_normativi` con `fonte_url`, `data_verifica`, `data_validita`. Il motore di calcolo legge da lì, non da costanti hardcodate.
3. **Calcolo deterministico separato dall'AI**: i calcoli fiscali (imposta sostitutiva, contributi, F24) sono funzioni pure deterministiche. L'AI (commercialista AI) è un layer consultivo sopra, mai fonte di verità numerica.
4. **n8n come orchestratore leggero**: job schedulati (alert, sync scadenze, refresh tassi), non come backend principale. La logica di business vive in Supabase Edge Functions (Deno) o nel frontend.
5. **Provider SDI come black-box esterno**: la piattaforma non si accredità direttamente a SDI (SDICoop è oneroso e lento). Usa un provider con API REST.

---

## 4. Stack tecnologico (conforme Neurora)

| Layer | Tecnologia | Note |
|---|---|---|
| Frontend | React 18 (TypeScript) + Vite | Tailwind CSS per lo stile |
| UI/Font | Plus Jakarta Sans (UI) + DM Mono (numeri) | Light corporate-tech |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) | RLS multi-tenant, pgvector per RAG |
| RAG/Embeddings | Supabase pgvector | Fonti normative indicizzate |
| LLM | API esterna (OpenAI/Anthropic/Groq) | Scelta in `commercialista_ai.md` |
| Orchestrazione | n8n su Hostinger | Cron job per alert, sync |
| Deploy frontend | Vercel | CI/CD automatico |
| Provider SDI | Da definire (raccomandazione in §6) | API REST |
| Migrazione | API Fatture in Cloud (TeamSystem) | One-time, clonazione |

**Deviazioni dallo stack**: nessuna. Tutto rientra nello standard Neurora.

---

## 5. Modello dati condiviso

### 5.1 Tabelle principali (schema logico)

```
tenants
  id (uuid, PK)
  denominazione (text)
  piva (text)
  cf (text)
  sede_json (jsonb)
  pec (text)
  rea (text)
  created_at (timestamptz)

profili_fiscali
  id (uuid, PK)
  tenant_id (uuid, FK → tenants)
  regime (enum: 'forfettario', 'semplificato')  -- MVP: forfettario
  ateco_codici (jsonb)  -- [{codice: "59.20.3", coeff: 0.67, prevalente: true}, ...]
  aliquota_sostitutiva (numeric)  -- 0.15 o 0.05
  aliquota_inps (numeric)  -- 0.2607
  gestione_inps (enum: 'separata', 'artigiani', 'commercianti', 'cassa')
  data_apertura_piva (date)  -- per calcolo agevolazione 5%
  anno_inizio_agevolazione (int)  -- derivato
  updated_at (timestamptz)

clienti (controparti attive)
  id (uuid, PK)
  tenant_id (uuid, FK)
  denominazione (text)
  piva (text)
  cf (text)
  codice_destinatario (text)  -- SDI, 7 char
  pec_destinatario (text, nullable)
  indirizzo_json (jsonb, nullable)
  created_at (timestamptz)

fornitori (controparti passive)
  -- stessa struttura di clienti, tabella separata per chiarezza

fatture
  id (uuid, PK)
  tenant_id (uuid, FK)
  numero (text)
  data (date)
  tipo (enum: 'attiva', 'passiva')
  controparte_id (uuid, FK → clienti | fornitori)
  imponibile (numeric)  -- per forfettario = totale, no IVA
  descrizione (text)
  stato_sdi (enum: 'bozza', 'inviata', 'consegnata', 'scartata', 'ricevuta')
  sdi_identificativo (text, nullable)  -- ID tracciamento
  xml_url (text, nullable)  -- Storage Supabase
  pdf_url (text, nullable)
  metadata (jsonb)  -- ricevute SDI, esiti
  created_at (timestamptz)

movimenti_contabili (registrazione fatture per calcolo)
  id (uuid, PK)
  tenant_id (uuid, FK)
  fattura_id (uuid, FK → fatture, nullable)  -- se derivato da fattura
  data (date)
  tipo (enum: 'ricavo', 'costo', 'contributo', 'imposta')
  ateco_codice (text)  -- per ripartizione multi-ATECO
  importo (numeric)
  descrizione (text)
  created_at (timestamptz)

f24_generati
  id (uuid, PK)
  tenant_id (uuid, FK)
  anno_riferimento (int)
  tipo (enum: 'saldo', 'acconto_1', 'acconto_2', 'unico')
  data_scadenza (date)
  righe (jsonb)  -- [{sezione, codice_tributo, anno, importo}, ...]
  stato (enum: 'bozza', 'pronto', 'pagato')
  pdf_url (text, nullable)
  created_at (timestamptz)

scadenze
  id (uuid, PK)
  tenant_id (uuid, FK)
  tipo (enum: 'f24_saldo', 'f24_acconto_1', 'f24_acconto_2', 'dichiarazione', 'altro')
  data (date)
  importo_stimato (numeric, nullable)
  stato (enum: 'pendente', 'notificata', 'completata')
  created_at (timestamptz)

dichiarazioni_redditi
  id (uuid, PK)
  tenant_id (uuid, FK)
  anno_imposta (int)
  stato (enum: 'bozza', 'precompilata', 'pronta', 'inviata_manualmente')
  quadri (jsonb)  -- {LM: {...}, RW: {...}, ...}
  pdf_url (text, nullable)
  created_at (timestamptz)

dati_normativi  -- tabella di configurazione delle regole fiscali
  id (uuid, PK)
  chiave (text, unique)  -- es. 'imposta_sostitutiva_forfettario', 'coeff_ateco_59.20.3'
  valore (numeric)
  descrizione (text)
  fonte_url (text)
  fonte_nome (text)
  data_verifica (date)
  data_validita_da (date)
  data_validita_a (date, nullable)


### 5.3 Valori in `dati_normativi` (verificati 11/07/2026)

| chiave | valore | fonte_url | data_verifica | data_validita |
|---|---|---|---|---|
| `imposta_sostitutiva_forfettario` | 0.15 | Art. 1 c.54-89 L.190/2014 (Normattiva) | 2026-07-11 | 2026-01-01 → |
| `imposta_sostitutiva_agevolata` | 0.05 | Art. 1 c.54 L.190/2014 (Normattiva) | 2026-07-11 | primi 5 anni |
| `coeff_ateco_59.20.3` | 0.67 | Allegato 2 L.190/2014 (Agenzia Entrate) | 2026-07-11 | 2026 → |
| `coeff_ateco_62.01.00` | 0.67 | Allegato 2 L.190/2014 (Agenzia Entrate) | 2026-07-11 | 2026 → |
| `aliquota_inps_gestione_separata` | 0.2607 | INPS 2026 (forfettari.it) | 2026-07-11 | 2026-01-01 → |
| `aliquota_inps_con_altra_copertura` | 0.24 | INPS 2026 (forfettari.it) | 2026-07-11 | 2026-01-01 → |
| `massimale_inps_gestione_separata` | 120000 | INPS 2026 (forfettari.it) | 2026-07-11 | 2026 → (*non rilevante per forfettario*) |
| `soglia_ricavi_forfettario` | 85000 | Art. 1 c.54 L.190/2014 (Normattiva) | 2026-07-11 | 2026 → |
| `soglia_esclusione_immediata` | 100000 | Art. 1 c.57 L.190/2014 (Normattiva) | 2026-07-11 | 2026 → |
| `soglia_reddito_dipendente` | 35000 | Art. 1 c.54 L.190/2014 aggiornato (Legge di Bilancio) | 2026-07-11 | 2026 → |
| `acconto_prima_rata` | 0.50 | Art. 58 DL 124/2019; ris. AdE 93/E 12/11/2019 | 2026-07-11 | 2026 → |
| `acconto_seconda_rata` | 0.50 | Art. 58 DL 124/2019; ris. AdE 93/E 12/11/2019 | 2026-07-11 | 2026 → |
| `soglia_acconto_non_dovuto` | 51.65 | Istruzioni F24 (Agenzia Entrate) | 2026-07-11 | 2026 → |
| `soglia_acconto_unica_soluzione` | 257.52 | Istruzioni F24 (Agenzia Entrate) | 2026-07-11 | 2026 → |
| `natura_iva_forfettario` | N2.2 | Specifica FatturaPA (Agenzia Entrate) | 2026-07-11 | 2021 → |
| `sanzione_base_omesso_versamento` | 0.25 | D.Lgs. 87/2024 (riforma sanzioni) | 2026-07-11 | 2024-09-01 → |
| `codice_tributo_bollo_I_trim` | 2521 | Agenzia Entrate codici tributo | 2026-07-11 | *da verificare* |
| `codice_tributo_bollo_II_trim` | 2522 | Agenzia Entrate codici tributo | 2026-07-11 | *da verificare* |
| `codice_tributo_bollo_III_trim` | 2523 | Agenzia Entrate codici tributo | 2026-07-11 | *da verificare* |
| `codice_tributo_bollo_IV_trim` | 2524 | Agenzia Entrate codici tributo | 2026-07-11 | *da verificare* |
| `tasso_rateizzazione_f24` | 0.04 | Istruzioni F24 (Agenzia Entrate) | 2026-07-11 | 2026 → |
| `scadenza_redditi_pf_2026` | 2026-11-02 | Agenzia Entrate (31/10 sabato → slitta) | 2026-07-11 | 2026 |
| `scadenza_f24_giugno_2026` | 2026-06-30 | Istruzioni F24 | 2026-07-11 | 2026 |
| `scadenza_f24_novembre_2026` | 2026-11-30 | Istruzioni F24 | 2026-07-11 | 2026 |
| `codice_tributo_1790_saldo` | 1790 | Agenzia Entrate codici tributo | 2026-07-11 | 2026 → |
| `codice_tributo_1791_acconto_1` | 1791 | Agenzia Entrate codici tributo | 2026-07-11 | 2026 → |
| `codice_tributo_1792_acconto_2` | 1792 | Agenzia Entrate codici tributo | 2026-07-11 | 2026 → |
| `tasso_legale_2026` | 0.0160 | DM Economia 10/12/2025, G.U. 13/12/2025 n.289 | 2026-07-11 | 2026-01-01 → |
| `codice_inps_gestione_separata_2026` | P10 | INPS — sezione INPS mod. F24 (causale P10, saldo+2 acconti; "R" per rateizzazione, "DPPI" per interessi da differimento) | 2026-07-11 | 2026 → |
chat_sessions (commercialista AI)
  id (uuid, PK)
  tenant_id (uuid, FK)
  created_at (timestamptz)

chat_messages
  id (uuid, PK)
  session_id (uuid, FK → chat_sessions)
  role (enum: 'user', 'assistant', 'system')
  content (text)
  sources (jsonb)  -- [{url, title, excerpt}]
  created_at (timestamptz)

fonti_rag  -- documenti per RAG del commercialista AI
  id (uuid, PK)
  titolo (text)
  fonte_url (text)
  contenuto (text)
  embedding (vector(1536))  -- pgvector
  categoria (enum: 'normativa', 'circolare', 'guida', 'faq')
  data_pubblicazione (date)
  data_indicizzazione (date)
  updated_at (timestamptz)

alert_log
  id (uuid, PK)
  tenant_id (uuid, FK)
  tipo (text)
  messaggio (text)
  canale (enum: 'email', 'in_app')
  inviato_at (timestamptz)
  letto (boolean, default false)
```

### 5.2 Invarianti e vincoli

- `fatture.tenant_id` matcha sempre `controparte.tenant_id` (constraint + RLS).
- `f24_generati.righe` deve contenere solo codici tributo validi per il regime del tenant.
- `dati_normativi` con `data_validita_a IS NULL OR data_validita_a >= CURRENT_DATE` è la versione "attiva".
- `profili_fiscali.aliquota_sostitutiva` si deriva da `data_apertura_piva` (5% se <= 5 anni, 15% oltre) ma è sovrascrivibile per casi speciali.
- Ogni tabella con `tenant_id` ha una policy RLS: `USING (tenant_id = auth.uid() OR tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))`.

---

## 6. Integrazioni esterne

| Servizio | Scopo | Modalità | Stato |
|---|---|---|---|
| Provider SDI | Invio/ricezione fatture elettroniche + conservazione | API REST, webhook | Da scegliere (raccomandazione: vedi `fatturazione_elettronica.md`) |
| Fatture in Cloud API | Migrazione dati storici (clienti, fatture) | API REST (OAuth), one-time | Da implementare in fase di migrazione |
| LLM (OpenAI/Anthropic/Groq) | Commercialista AI (Q&A + generazione alert) | API REST | Da scegliere in `commercialista_ai.md` |
| Fonti RAG | Normativa, circolari, guide | Scraping/ingestione periodica | Agenzia Entrate, INPS, Normattiva |
| n8n (Hostinger) | Cron job: alert scadenze, refresh tassi, sync | Workflow schedulati | Da configurare |
| Supabase Edge Functions | API custom (calcoli, integrazioni SDI) | Deno runtime | Da implementare |
| Servizio email (Resend/Supabase) | Invio alert proattivi commercialista AI | API | Da configurare |

### 6.1 Raccomandazione provider SDI (riassunto)

Dettagli completi in `fatturazione_elettronica.md`. Sintesi:

- **Aruba Fatturazione Elettronica**: 29,90 €+IVA/anno (canone base, 1 GB spazio), include conservazione a norma AgID 10 anni. **API REST v2 verificate e confermate** (fatturazioneelettronica.aruba.it/apidoc/v2/docs.html): OAuth2, endpoint per invio/ricerca/ricezione/conservazione, rate limit a tier (60–30.000 richieste/ora, leaky bucket), supporto sia webhook/callback sia polling. **Richiede un'utenza Premium** (o utenza base delegata da un account Premium) per l'accesso ai Web Services — il solo piano base non basta.
- **Openapi (openapi.com)**: marketplace API, pay-per-use. Ha servizi SDI/fatturazione. Flessibile per SaaS ma costo per-chiamata.
- **A-Cube / eFattura**: provider specializzato, API REST documentate. Da verificare prezzo e disponibilità.
- **Namirial**: provider SDI con API, ma orientato a enterprise.

**Decisione (Q-001 risolta, 11/07/2026)**: **Aruba confermato** per il MVP single-tenant. API REST solide, rate limit generosi per il volume di un singolo founder, costo ben dentro il budget di 100 €/anno anche con l'upgrade a utenza Premium. Per la fase SaaS futura, rivalutare Openapi/A-Cube per l'integrazione programmatica multi-tenant su volumi più alti.

---

## 7. Roadmap e MVP

### 7.1 Priorità delle funzionalità (decisa dal lead)

Ordine di esecuzione basato su: valore immediato per il founder, dipendenze tecniche, e complessità decrescente.

| Fase | Funzionalità | Rationale |
|---|---|---|
| **MVP-1** | Fatturazione elettronica | Prerequisito di tutto: senza fatture non ci sono ricavi da cui calcolare tasse. Include migrazione da FiC. |
| **MVP-2** | Previsione tasse | Dipende da fatture. Massimo valore percepito: "quanto devo pagare?" |
| **MVP-3** | Generazione F24 | Dipende da previsione tasse. Chiude il ciclo operativo. |
| **MVP-4** | Commercialista AI | Indipendente ma meno urgente. Richiede setup RAG più lungo. |
| **MVP-5** | Dichiarazione redditi | Ultima: richiede tutti i dati dell'anno. Meno frequente (1×/anno). |

### 7.2 Timeline indicativa

| Periodo | Deliverable |
|---|---|
| Mese 1 | Setup progetto (Supabase, auth, schema DB, migrazione da FiC) + MVP fatturazione |
| Mese 2 | Previsione tasse (dashboard) + motori di calcolo forfettario |
| Mese 3 | Generazione F24 + scadenze + alert |
| Mese 4 | Commercialista AI (RAG + chat + alert proattivi) |
| Mese 5 | Dichiarazione redditi (pre-compilazione) + polish |

*Timeline indicativa per un solo founder che lavora in parallelo allo sviluppo. Può comprimersi o estendersi.*

### 7.3 Migrazione da Fatture in Cloud

- **Tipo**: clonazione (copia), NON cancellazione. FiC resta attivo come fallback.
- **Cosa migrare**: clienti, fornitori, fatture attive/passive storiche, impostazioni anagrafiche.
- **Come**: API REST Fatture in Cloud (OAuth2). Script one-time che legge e inserisce in Supabase.
- **Verifica**: confronto conteggio documenti FiC vs Supabase post-migrazione.

---

## 8. Registro decisioni

| # | Data | Decisione | Motivazione |
|---|---|---|---|
| D-001 | 2026-07-11 | Single-tenant ora, multi-tenant-ready | Founder usa da solo; SaaS futuro |
| D-002 | 2026-07-11 | Pre-compilazione dichiarazione, no invio telematico | Vincolo legale: invio per terzi = intermediari abilitati (art. 3 c.3 DPR 322/1998) |
| D-003 | 2026-07-11 | F24: generazione modello + istruzioni, no pagamento API banca | Complessità elevata, MVP cerca valore rapido |
| D-004 | 2026-07-11 | Provider SDI esterno via API, no accreditamento proprio | SDICoop oneroso e lento per un solo founder |
| D-005 | 2026-07-11 | Calcoli fiscali deterministici separati dall'AI | L'AI non è fonte di verità numerica |
| D-006 | 2026-07-11 | `dati_normativi` come tabella con fonti verificate | Regola §7: non fidarsi della memoria |
| D-007 | 2026-07-11 | n8n per cron/alert, non come backend | Stack Neurora standard, orchestrazione leggera |
| D-008 | 2026-07-11 | Migrazione = clonazione, FiC resta attivo | Sicurezza: fallback se piattaforma non pronta |
| D-009 | 2026-07-11 | Palette Neurora di default | Confermato dal founder |
| D-010 | 2026-07-11 | Nome prodotto da definire | "Neurora Fiscale" non convince il founder |
| D-011 | 2026-07-11 | Acconti forfettari 50/50 (non 40/60) | Soggetti ISA: art. 58 DL 124/2019; ris. AdE 93/E 12/11/2019 |
| D-012 | 2026-07-11 | Contributi deducibili per cassa (versati) | Principio di cassa nel Quadro LM, non maturati |
| D-013 | 2026-07-11 | Natura IVA XML: N2.2 (non N2) | Dal 2021 N2 da solo non è valido; N2.2 = operazioni non soggette, altri casi |
| D-014 | 2026-07-11 | Base sanzione ravvedimento: 25% | D.Lgs. 87/2024 (riforma sanzioni, dal 1/9/2024) |
| D-015 | 2026-07-11 | Codici bollo virtuale: 2521-2524 (trimestrali) | Non 2506 — codici per trimestre su F24 |
| D-016 | 2026-07-11 | Rateizzazione fino al 16 dicembre, 4% annuo | Non 6 rate a novembre con 0,40% per rata |
| D-017 | 2026-07-11 | Scadenza Redditi PF 2026: 2 novembre | 31/10 cade di sabato, slitta al primo lunedì |
| D-018 | 2026-07-11 | Aruba ha API REST documentate | Confermato: fatturazioneelettronica.aruba.it/apidoc/docs |
| D-019 | 2026-07-11 | Aruba confermato come provider SDI definitivo per MVP | API v2 REST verificate, rate limit adeguati, costo entro budget anche con utenza Premium richiesta per i Web Services |
| D-020 | 2026-07-11 | Metodo acconto default: storico (100% versamenti anno precedente) | Più prevedibile e verificabile; previsionale solo per primo anno di attività o su scelta esplicita dell'utente |
| D-021 | 2026-07-11 | Dichiarazione redditi: MVP genera pre-compilazione a video + PDF, non il file telematico ufficiale | Formato telematico Entratel/Fisconline richiede specifiche complesse (DR-001) e software abilitato; coerente con D-002 (invio resta a carico dell'utente via Fisconline) |

---

## 9. Registro domande aperte

| # | Domanda | Bloccante? | Note |
|---|---|---|---|
| Q-001 | ~~Provider SDI definitivo: Aruba ha API REST pubbliche?~~ **Risolta**: sì, API v2 REST confermate (OAuth2, rate limit a tier, webhook+polling), serve utenza Premium | No | Chiusa (11/07/2026) |
| Q-002 | ~~Coefficienti ATECO 59.20.3 e 62.01.00 al 67% per 2026?~~ **Risolta**: confermati al 67% (allegato 2 L.190/2014, gruppo "altre attività") | No | Chiusa — confermato |
| Q-003 | ATECO 62.01.00 è registrato come secondario nel RI? | No | Visura allegata è vecchia (2018); chiedere visura aggiornata |
| Q-004 | Nome prodotto definitivo | No | Da decidere in fase di design |
| Q-005 | Palette dedicata al prodotto fiscale? | No | Per ora si usano colori Neurora; punto aperto in §7 del prompt |
| Q-006 | LLM provider per commercialista AI: OpenAI, Anthropic, Groq? | No | Valutare costo/qualità/latenza in `commercialista_ai.md` |
| Q-007 | Servizio email per alert: Resend, Supabase, o altro? | No | Valutare in `commercialista_ai.md` |
| Q-008 | ~~Soglia reddito dipendente: 30k o 35k?~~ **Risolta**: 35.000 € per 2026 | No | Chiusa — art. 1 c.54 L.190/2014 (Legge di Bilancio aggiornata) |
| Q-009 | ~~Massimale INPS Gestione Separata 2026?~~ **Risolta**: non rilevante per il forfettario | No | Chiusa — con soglia 85k e coeff 67%, reddito massimo ~56.950 €, ben sotto il massimale. Codice può tenere il cap come parametro per generalità |
| Q-010 | Per il SaaS futuro: piano gratuito/trial? | No | Decidere in fase di go-to-market |

---

## 10. Confronto tra le cinque lenti esperte (sintesi)

Il documento master raccoglie qui le principali tensioni emerse tra le lenti; i dettagli sono nei singoli `.md`.

### Tensione 1: Product vs Compliance (dichiarazione redditi)
- **Product**: vorrebbe invio telematico in un click (" sarebbe bello che la piattaforma lo inoltrasse direttamente").
- **Compliance**: l'invio per conto di terzi è riservato agli intermediari abilitati (art. 3 c.3 DPR 322/1998). Un software non può trasmettere dichiarazioni altrui senza abilitazione.
- **Compromesso**: la piattaforma pre-compila e genera il file pronto; l'utente trasmette via Fisconline con SPID. Per il founder (dichiarazione per sé) questo è legittimo. Per il SaaS futuro, serve partnership con un intermediario o limitazione esplicita. → D-002.

### Tensione 2: Product vs Compliance (F24 pagamento)
- **Product**: vorrebbe pagamento via API banca.
- **Compliance/Security**: integrazione bancaria (PSD2, open banking) richiede autorizzazioni regolamentari e gestione di credenziali sensibili.
- **Compromesso**: MVP genera l'F24 e dà istruzioni (home banking / F24 web). Pagamento API è possibile ma post-MVP. → D-003.

### Tensione 3: Product vs Business (provider SDI)
- **Product**: vorrebbe API ricche e flessibili.
- **Business**: budget 100 €/anno limita le opzioni. Aruba è economica ma API limitate; Openapi è flessibile ma pay-per-use.
- **Compromesso**: verificare API Aruba (Q-001). Se insufficienti, Openapi in single-tenant con volume basso = costo contenuto. → D-004.

### Tensione 4: AI vs Normativo (commercialista AI)
- **AI**: vorrebbe risposte fluide e proattive.
- **Normativo**: l'AI non è un professionista abilitato; non può dare pareri vincolanti.
- **Compromesso**: RAG su fonti ufficiali + disclaimer + tracciabilità. L'AI cita sempre la fonte. → `commercialista_ai.md`.

---

## 11. Next step

1. **Confermare o aggiornare** le decisioni D-001..D-021 con il founder.
2. ~~Risolvere Q-001~~ (provider SDI) — **chiusa**: Aruba confermato, nessun blocco residuo per lo sviluppo.
3. Leggere i 6 `.md` di dettaglio per allineamento tecnico.
4. Approvare la roadmap e iniziare la fase di codifica dal MVP-1 (fatturazione).
5. Punti ancora aperti ma non bloccanti: REA e ATECO secondario da confermare su visura camerale aggiornata (§2.2); nome prodotto da decidere in fase di design (§2.3 F2).
