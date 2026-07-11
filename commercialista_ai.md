# Commercialista AI

> **Progetto**: Piattaforma fiscale Neurora
> **Data**: 11 luglio 2026

---

## 1. Obiettivo

Un consulente fiscale AI a cui fare domande e chiedere pareri, che monitora la posizione fiscale del forfettario, è sempre aggiornato su fonti attendibili e agisce proattivamente (alert via email, suggerimenti, avvisi su scadenze e soglie). Non sostituisce un professionista abilitato, ma è un assistente che riduce drasticamente il bisogno di consulenza professionale per le questioni ordinarie.

**Per chi**: il founder (forfettario), con estensione a tutti i forfettari nel SaaS.

---

## 2. Ambito

### In scope
- Chat Q&A in linguaggio naturale su questioni fiscali (regime forfettario, IVA, SDI, F24, INPS, scadenze)
- RAG (Retrieval-Augmented Generation) su fonti normative ufficiali e aggiornate
- Citazione delle fonti in ogni risposta
- Alert proattivi via email:
  - Scadenze F24 (15 e 7 giorni prima)
  - Avvicinamento soglia fatturato (75k, 85k)
  - Scadenza dichiarazione redditi
  - Anomalia nei dati di fatturazione
- Sintesi periodica (email settimanale/mensile) dello stato fiscale
- Suggerimenti di ottimizzazione (es. "stai per superare la soglia, valuta di emettere la fattura a gennaio")
- Contesto personalizzato: l'AI conosce il profilo fiscale, i dati di fatturazione e le scadenze del tenant

### Out of scope (MVP)
- Pareri vincolanti o sostitutivi del professionista abilitato
- Compilazione automatica di documenti fiscali (fatto dai moduli dedicati)
- Interazione telefonica/vocale (post-MVP)
- Assistenza per regimi non forfettari (SaaS futuro)
- Generazione di documenti legali o pareri formali

---

## 3. Analisi normativa

### 3.1 Limite legale: AI e professioni regolamentate

| Regola | Riferimento | Impatto |
|---|---|---|
| La consulenza fiscale professionale è riservata a commercialisti iscritti all'Albo | DL 139/2005, art. 1; DPR 901/1973 | L'AI non può fornire "consulenza fiscale" in senso formale |
| Pareri vincolanti: solo l'Agenzia delle Entrate (interpello) o professionisti abilitati | Art. 10-quinquies L. 212/2000 | L'AI non può dare pareri vincolanti |
| AI Act (Regolamento UE 2024/1689) | Entrato in vigore 2024, applicazione graduale | Sistemi AI devono essere trasparenti, tracciabili; no AI ad alto rischio senza conformità |

**Impatto sul design**:
- Ogni risposta dell'AI deve avere un disclaimer: "Questa è un'informazione basata su fonti pubbliche. Non sostituisce la consulenza di un professionista abilitato."
- L'AI non deve mai formulare consigli specifici che implicano una decisione fiscale vincolante (es. "devi versare X euro" — invece: "secondo i dati a sistema, l'importo stimato è X euro; verifica con il tuo commercialista").
- L'AI deve sempre citare la fonte normativa.
- Tracciabilità: ogni risposta è loggata con timestamp, fonti citate, prompt, contesto.

### 3.2 Fonti normative da indicizzare (RAG)

| Fonte | URL | Categoria |
|---|---|---|
| Agenzia delle Entrate — guide e schede | agenziaentrate.gov.it | normativa ufficiale |
| Agenzia delle Entrate — circolari e risoluzioni | agenziaentrate.gov.it | prassi amministrativa |
| INPS — portale e circolari | inps.it | previdenza |
| Normattiva — testi normativi | normattiva.it | legislazione |
| Fiscoetasse, Informazione Fiscale, etc. | vari | guide e articoli (fonte secondaria) |

**Aggiornamento**: cron n8n che fa scrape/ingestion di nuove circolari e guide ogni settimana. Indicizzazione con embeddings in pgvector.

### 3.3 GDPR e AI Act

| Aspetto | Dettaglio |
|---|---|
| Base giuridica | Esecuzione contratto (art. 6 c.1 b GDPR) per l'elaborazione dei dati necessari al servizio |
| Categoria dati | Fiscale = categoria delicata ma non "dati sensibili" ex art. 9 GDPR (salvo dettagli sanitari in descrizioni) |
| Trasparenza AI Act | L'utente deve sapere che sta interagendo con un'AI, non un umano. Chiaro in UI. |
| Log e tracciabilità | Conservazione chat con fonti citate per 24 mesi (per audit AI Act). |
| Retention | Dati di chat: 24 mesi. Embedding: aggiornati ciclicamente. Fonti RAG: persistenti, aggiornate. |

---

## 4. Analisi concorrenti (per questa funzione)

| Concorrente | AI / Assistente | Come |
|---|---|---|
| Fatture in Cloud | No (TeamSystem AI "in arrivo" su piano Complete) | Non disponibile; quando arriverà, solo sul piano più costoso |
| Aruba | No | Nessuna AI |
| Fattura24 | No | Nessuna AI |
| Fiscozen | Commercialista umano dedicato | 499 €/anno — costoso, non scalabile, ma reale e competente |
| TeamSystem | No (in arrivo) | Enterprise, costo elevato |
| Agenzia Entrate | Contact center (umano, lento) | Non AI, risposte generiche |
| ChatGPT / Claude (generico) | Sì, ma non ancorato a fonti italiane aggiornate | Allucinazioni, nessuna tracciabilità, nessun contesto fiscale personalizzato |

**Cosa possiamo fare meglio**: AI specializzata sul fisco italiano, ancorata a fonti ufficiali verificate (RAG), con contesto personalizzato (conosce i tuoi dati di fatturazione), proattiva (alert email, non solo reattiva), e con tracciabilità delle fonti. Tra il "commercialista umano" costoso di Fiscozen e il "chatbot generico" di OpenAI, Neurora offre l'AI fiscale scalabile a costo near-zero.

---

## 5. Opzioni tecniche

### Opzione A: RAG con LLM esterno (OpenAI/Anthropic/Groq)

| Dimensione | Valutazione |
|---|---|
| Come | Embeddings di fonti normative in pgvector (Supabase). Query dell'utente → semantic search in pgvector → top-k documenti → prompt contestualizzato al LLM → risposta con citazioni. |
| Pro | Flessibile, aggiornabile, qualità alta, fonti citate |
| Contro | Costo per chiamata LLM (variabile), latenza (1-3s), dipendenza da provider |
| Costi | OpenAI GPT-4o-mini: ~0,15 $/1M input tokens, ~0,60 $/1M output. Per 100 chat/mese: ~5-10 $/mese. Groq (Llama 3): più economico, più veloce. |
| Rischi | Allucinazioni del LLM — mitigato da RAG + disclaimer + contesto limitato |
| **Raccomandazione** | **Sì** — è l'approccio standard per AI ancorata a fonti |

### Opzione B: Fine-tuning di un modello open-source

| Dimensione | Valutazione |
|---|---|
| Come | Fine-tune di Llama 3 o simile su dataset di Q&A fiscali italiane. Hosting su provider GPU (Replicate, Modal, self-hosted). |
| Pro | Controllo completo, nessun costo per chiamata, personalizzazione profonda |
| Contro | Costo di training, manutenzione del modello, infrastruttura GPU, qualità incerta vs LLM commerciale |
| Costi | Training: 50-200 €. Hosting: 20-100 €/mese (se always-on) o pay-per-use (Modal) |
| Rischi | Qualità inferiore a GPT-4 per task complessi, obsolescenza rapida |
| **Raccomandazione** | No (MVP) — troppo complesso per un solo founder. Rivalutare per SaaS a scala. |

### Opzione C: Ricerca keyword-based (no LLM)

| Dimensione | Valutazione |
|---|---|
| Come | Sistema di FAQ con ricerca full-text. Nessun LLM. |
| Pro | Costo zero, zero latenza, zero allucinazioni |
| Contro | Nessuna flessibilità, nessuna comprensione del linguaggio naturale, esperienza povera |
| Rischi | Non risponde alla domanda ("come faccio a...") ma solo a query keyword |
| **Raccomandazione** | No — non è "AI" |

### Decisione

**Opzione A: RAG + LLM esterno**. Modello raccomandato per MVP: **GPT-4o-mini** (OpenAI) per il miglior rapporto qualità/costo/latenza, o **Groq + Llama 3 70B** se si preferisce un'opzione più economica e più veloce. Il RAG in pgvector (Supabase) è l'infrastruttura neutra; il LLM è intercambiabile dietro un'interfaccia.

---

## 6. Modello dati

### 6.1 Tabelle coinvolte

```
-- Da 00_architettura_e_decisioni.md:
chat_sessions
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

fonti_rag
  id (uuid, PK)
  titolo (text)
  fonte_url (text)
  contenuto (text)
  embedding (vector(1536))  -- pgvector, dimensione dipende dal modello
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
  metadata (jsonb)  -- contesto dell'alert (es. fatturato al momento dell'alert)
```

### 6.2 Invarianti

- `chat_messages` di `role='assistant'` devono sempre avere `sources` non nullo (l'AI cita sempre le fonti).
- `fonti_rag` ha `embedding` univoco per `fonte_url` (no duplicati).
- `alert_log` non duplica alert dello stesso tipo entro 24h per lo stesso tenant (rate limiting).
- I messaggi di `role='system'` contengono il contesto (profilo fiscale, fatturato YTD, scadenze) e non sono visibili all'utente.

---

## 7. Logica e flussi

### 7.1 Flusso: chat Q&A (RAG)

```
1. Utente scrive domanda ("Quanto devo versare a giugno?")
2. Frontend invia a Edge Function /chat
3. Edge Function:
   a. Recupera contesto del tenant (profilo, fatturato YTD, scadenze)
   b. Semantic search in fonti_rag: embedding(query) → top-5 documenti pgvector
   c. Costruisce prompt:
      - System: "Sei un assistente fiscale AI per un forfettario. Rispondi usando SOLO le fonti fornite. Cita sempre la fonte. Se non sai, dilo. Non dare pareri vincolanti. Disclaimer obbligatorio."
      - Context: [dati del tenant]
      - Sources: [top-5 documenti]
      - User: [domanda originale]
   d. Chiama LLM (OpenAI/Groq)
   e. Post-processa risposta: estrai citazioni, aggiungi disclaimer
   f. Salva in chat_messages (role='assistant', sources=[...])
4. Frontend mostra risposta con badge fonti cliccabili
```

### 7.2 Flusso: alert proattivi (n8n cron)

```
n8n workflow (esecuzione quotidiana, ore 08:00):

1. Per ogni tenant attivo:
   a. Chiama Edge Function /check-alerts(tenant_id)
   b. Edge Function verifica:
      - Scadenza F24 entro 15 o 7 giorni → alert "f24_scadenza"
      - Fatturato cumulato > 75k → alert "soglia_preavviso"
      - Fatturato cumulato > 85k → alert "soglia_critica"
      - Scadenza dichiarazione entro 30 giorni → alert "dichiarazione_scadenza"
      - Anomalia: fatturato mensile anomalo vs media → alert "anomalia"
      - Ravvedimento opportuno se F24 scaduto e non pagato → alert "ravvedimento"
   c. Se alert presente e non inviato nelle ultime 24h:
      - Genera messaggio personalizzato (LLM con contesto del tenant)
      - Invia email (Resend/Supabase)
      - Salva in alert_log
```

### 7.3 Flusso: sintesi periodica (email)

```
n8n workflow (esecuzione settimanale, lunedì 09:00):

1. Per ogni tenant attivo:
   a. Edge Function /sintesi(tenant_id, periodo='settimana')
   b. Recupera: fatturato settimana, tasse accumulate, prossime scadenze, stato F24
   c. Genera sintesi testuale (LLM con template)
   d. Invia email: "Riepilogo fiscale della settimana"
   e. Salva in alert_log (tipo='sintesi_settimanale')
```

### 7.4 Pseudocodice: query RAG

```typescript
async function ragQuery(tenantId, userMessage) {
  // 1. Recupera contesto tenant
  const contesto = await getContestoTenant(tenantId)
  // { profilo: {ateco, aliquota, regime}, fatturato_ytd, scadenze_prossime }

  // 2. Semantic search in pgvector
  const queryEmbedding = await embed(userMessage) // OpenAI embeddings API
  const sources = await supabase.rpc('match_fonti_rag', {
    query_embedding: queryEmbedding,
    match_count: 5,
  })
  // returns: [{titolo, fonte_url, contenuto, similarity}]

  // 3. Costruisci prompt
  const systemPrompt = `
Sei un assistente fiscale AI per una Partita IVA in regime forfettario.
Rispondi usando SOLO le fonti fornite di seguito. Cita sempre la fonte.
Se non sai rispondere dalle fonti, dilo chiaramente.
Non fornire pareri vincolanti o consulenza professionale.
Disclaimer obbligatorio a fine risposta.
Dati del contribuente: ${JSON.stringify(contesto)}
Fonti:
${sources.map(s => `[${s.titolo}] ${s.fonte_url}\n${s.contenuto}`).join('\n\n')}
`

  // 4. Chiama LLM
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3, // bassa temperatura per ridurre allucinazioni
  })

  // 5. Post-processa
  const risposta = response.choices[0].message.content
  const disclaimer = "\n\n⚠️ Informazione basata su fonti pubbliche. Non sostituisce la consulenza di un professionista abilitato."

  return {
    risposta: risposta + disclaimer,
    sources: sources.map(s => ({ url: s.fonte_url, title: s.titolo })),
  }
}
```

### 7.5 Tipi di alert proattivi

| Tipo | Trigger | Messaggio esempio |
|---|---|---|
| f24_scadenza_15 | F24 scade entro 15 giorni | "Il tuo F24 di €X scade il 30 giugno. Scaricalo e pagalo." |
| f24_scadenza_7 | F24 scade entro 7 giorni | "URGENTE: il tuo F24 di €X scade tra 7 giorni." |
| soglia_preavviso | Fatturato cumulato > 75k | "Hai fatturato €75.234. Sei al 88% della soglia forfettario. Considera di posticipare fatturazione a gennaio." |
| soglia_critica | Fatturato cumulato > 85k | "ATTENZIONE: hai superato la soglia di 85.000 €. Potresti perdere il regime forfettario. Consulta un professionista." |
| dichiarazione_scadenza | Redditi scade entro 30 giorni | "Hai 30 giorni per inviare il Modello Redditi. La tua dichiarazione è pre-compilata e pronta." |
| anomalia_fatturato | Fatturato mensile > 3× media | "Fatturato di €X questo mese, anomalo rispetto alla media. Verifica." |
| ravvedimento | F24 scaduto e non pagato | "L'F24 di giugno è scaduto. Puoi ravvedere entro 14 giorni con sanzione ridotta." |
| sintesi_settimanale | Ogni lunedì | "Riepilogo: fatturato €X, tasse accumulate €Y, prossima scadenza: F24 30/06." |

---

## 8. Integrazioni & API

| Servizio | Endpoint | Scopo |
|---|---|---|
| OpenAI API (o Groq) | `POST /v1/chat/completions` | Generazione risposte chat |
| OpenAI Embeddings | `POST /v1/embeddings` | Embedding di query e fonti |
| Supabase pgvector | `RPC match_fonti_rag` | Semantic search RAG |
| Supabase Edge Function | `POST /functions/v1/chat` | Endpoint chat |
| Supabase Edge Function | `POST /functions/v1/check-alerts` | Logica alert |
| n8n (Hostinger) | Cron workflow | Esecuzione alert periodici |
| Resend (o Supabase email) | `POST /emails` | Invio alert email |
| Scraper fonti | n8n workflow | Ingestione fonti normative |

### 8.1 Interfaccia di astrazione LLM

```typescript
interface LLMProvider {
  chat(messages: Message[], options: ChatOptions): Promise<string>
  embed(text: string): Promise<number[]>
}

// Implementazioni: OpenAIProvider, GroqProvider, AnthropicProvider
```

---

## 9. Edge case & rischi

| Edge case | Impatto | Mitigazione |
|---|---|---|
| LLM allucina un dato normativo (es. aliquota sbagliata) | Informazione errata all'utente | RAG con fonti verificate; temperatura bassa (0.3); disclaimer; i calcoli numerici NON sono fatti dall'LLM ma dalla Edge Function deterministica |
| Fonte RAG obsoleta | Risposta con norma superata | `fonti_rag.updated_at` + cron di refresh settimanale; flag "da aggiornare" se > 90 giorni |
| Utente chiede parere specifico vincolante | L'AI non può dare pareri vincolanti | System prompt: rifiuta di dare pareri vincolanti; indirizza a professionista abilitato o interpello AdE |
| Dati fiscali del tenant nel prompt LLM | Privacy: dati inviati a terzo (OpenAI) | Minimizzazione: inviare solo dati aggregati (fatturato, non dettagli fatture). No dati sensibili. Politica di retention OpenAI: 30 giorni per default (o zero retention con API tier) |
| Costo LLM fuori controllo | Spesa imprevedibile | Rate limiting per tenant (max 100 chat/mese); budget alert; caching delle risposte identiche |
| Fonti non trovate per query specifica | Risposta inutile | L'AI risponde "Non ho fonti sufficienti per rispondere a questa domanda. Consulta l'Agenzia delle Entrate o un professionista." |
| Alert troppo frequenti | Spam, utente disattiva | Rate limiting: max 1 alert per tipo ogni 24h; impostazioni utente per disattivare categorie |
| n8n job fallisce | Alert non inviato | Retry automatico (n8n); monitoring; fallback: Edge Function Supabase come trigger alternativo |
| Embedding model deprecato | RAG rotto | Versionamento embedding model; re-index all fonti quando si cambia modello |
| Prompt injection | Utente manipola il system prompt | Sanitizzazione input; no esecuzione di comandi dal chat; contesto tenant in system, non in user message |

---

## 10. Compliance

| Aspetto | Dettaglio |
|---|---|
| **Disclaimer obbligatorio** | Ogni risposta AI termina con: "⚠️ Informazione basata su fonti pubbliche. Non sostituisce la consulenza di un professionista abilitato." |
| **AI Act** | Sistema trasparente: l'utente sa che interagisce con AI. Tracciabilità: log di prompt, risposte, fonti citate per 24 mesi. Non è "AI ad alto rischio" (non incide su decisioni critiche autonome — l'utente decide). |
| **GDPR** | Base giuridica: esecuzione contratto. Dati nel prompt: minimizzati (aggregati, non dettagliati). Provider LLM (OpenAI) come data processor: DPA necessario. |
| **Privacy con LLM** | OpenAI API: dati non usati per training (API tier). Zero retention configurabile. Groq: verificare policy di retention. |
| **Consulenza fiscale** | Esplicito in UI e disclaimer: "Questo servizio non fornisce consulenza fiscale professionale. Per pareri vincolanti, rivolgiti a un commercialista iscritto all'Albo o all'Agenzia delle Entrate (interpello)." |
| **Log audit** | chat_messages con sources, alert_log con metadata. Conservati 24 mesi per audit AI Act. |

---

## 11. Dipendenze

| Dipende da | Per cosa |
|---|---|
| Fatturazione elettronica | Dati di fatturazione per contesto e alert soglie |
| Previsione tasse | Calcoli per contesto ("quanto hai accumulato") |
| Generazione F24 | Scadenze per alert F24 |
| `fonti_rag` popolata | Base di conoscenza per RAG |
| Servizio email (Resend) | Invio alert proattivi |

| Alimenta | Come |
|---|---|
| Tutte le funzionalità | L'AI fornisce assistenza contestuale in ogni modulo (es. "come compilo questa fattura?", "cosa significa questo codice tributo?") |
| UX | Chat globale accessibile da ogni pagina |

---

## 12. Domande aperte

| # | Domanda | Bloccante? |
|---|---|---|
| CA-001 | LLM provider: OpenAI (GPT-4o-mini), Groq (Llama 3), Anthropic (Claude Haiku)? | No (intercambiabile) — *raccomandazione provvisoria*: Claude Haiku 4.5, buon compromesso costo/qualità/latenza e coerente con stack Anthropic; alternativa GPT-4o-mini se si preferisce restare su OpenAI. Non bloccante, da confermare prima di MVP-4. |
| CA-002 | Embedding model: OpenAI text-embedding-3-small (1536 dim) o altro? | No (pgvector, dimensione configurabile) |
| CA-003 | Servizio email: Resend, Supabase email, o altro? | No — *raccomandazione provvisoria*: Resend (API semplice, buon free tier, si integra bene con n8n/Edge Functions). Non bloccante, da confermare prima di MVP-4. |
| CA-004 | Frequenza sintesi periodica: settimanale o mensile? | No (consiglio: settimanale) |
| CA-005 | DPA con OpenAI necessario? (sì, per GDPR) | No (operativo) |
| CA-006 | Limite chat per tenant nel SaaS: 100/mese gratis, poi a pagamento? | No (decisione SaaS) |
| CA-007 | Quale set iniziale di fonti normative indicizzare? | No (iniziare con guide AdE su forfettario, INPS Gestione Separata, istruzioni F24 e Redditi) |

---

## 13. Next step

1. Scegliere CA-001 (LLM provider) — consiglio: GPT-4o-mini per MVP
2. Scegliere CA-002 (embedding model) — consiglio: text-embedding-3-small
3. Configurare pgvector in Supabase (estensione `vector`)
4. Identificare e indicizzare il primo set di fonti (CA-007):
   - Guida regime forfettario AdE
   - Circolari INPS Gestione Separata 2026
   - Istruzioni F24 codici tributo forfettario
   - Istruzioni Modello Redditi PF quadro LM
5. Progettare l'Edge Function `/chat` con RAG
6. Configurare n8n workflow per alert giornalieri e sintesi settimanale
7. Prototipare l'UI chat (widget globale accessibile da ogni pagina)
8. Scrivere il system prompt con contesto fiscale e vincoli di sicurezza
9. Implementare il rate limiting e il logging per compliance
