# Fatturazione Elettronica

> **Progetto**: Piattaforma fiscale Neurora
> **Data**: 11 luglio 2026

---

## 1. Obiettivo

Creare, inviare a SDI, ricevere e conservare a norma le fatture elettroniche per un titolare di Partita IVA in regime forfettario. Deve sostituire Fatture in Cloud come strumento quotidiano di fatturazione, coprendo il ciclo attivo (emissione) e passivo (ricezione), con migrazione dei dati storici.

**Per chi**: il founder (single-tenant), con architettura multi-tenant-ready per il futuro SaaS.

---

## 2. Ambito

### In scope
- Creazione di fatture elettroniche (TD01, TD04 nota di credito) in formato XML PA- compliant
- Invio a SDI tramite provider esterno con API REST
- Ricezione di fatture passive (notifiche SDI, download XML/PDF)
- Conservazione sostitutiva a norma (10 anni)
- Gestione anagrafiche clienti/fornitori con codice destinatario SDI
- Dicitura regime forfettario e calcolo bollo virtuale (2 € sopra 77,47 €)
- Dashboard fatture: stato invio, esiti, scartate
- Migrazione (clonazione) da Fatture in Cloud

### Out of scope (MVP)
- Fatturazione verso PA con ulteriori tipi documento (TD17/18/19 estere) — post-MVP
- Gestione IVA (il forfettario non applica IVA) — ma il sistema deve gestire il caso futuro di uscita dal forfettario
- Firmatura digitale avanzata (il provider la gestisce)
- Stampa e invio fisico
- Integrazione e-commerce (WooCommerce, Shopify) — post-MVP

---

## 3. Analisi normativa

### 3.1 Fatturazione elettronica obbligatoria

| Regola | Riferimento | Note |
|---|---|---|
| Obbligo fatturazione elettronica per tutti i titolari di P.IVA | DL 127/2015, art. 1 | Decorrenza 01/01/2019. Nessuna esenzione per forfettari |
| Formato XML conforme | Specifica tecnica SDI (Agenzia Entrate) | Schema XSD FatturaPA 1.9 (o versione vigente) |
| Canale di trasmissione | SDICoop (accreditamento proprio) o provider accreditato | SDICoop richiede accreditamento Agenzia Entrate, complesso per un solo founder |
| Codice destinatario | 7 caratteri per P.IVA; XXXXXXX per consumatore finale con PEC | Tabella codici destinatario su SDI |
| Conservazione sostitutiva | DPR 633/1972 art. 39; DPCM 03/12/2013 | Obbligo 10 anni. Conservatore accreditato AgID o servizio gratuito Agenzia Entrate (15 anni) |
| Dicitura regime forfettario | "Operazione senza applicazione IVA in regime forfettario, articolo 1 c.54-89 L.190/2014" | Obbligatoria su ogni fattura |
| Bollo virtuale | 2 € su fatture > 77,47 € verso privati (non PA) | Da indicare in XML (DatiBollo) e versare cumulative |

**Fonti**: DL 127/2015; Specifica tecnica Fatturazione Elettronica (Agenzia Entrate); centrofiscale.com (recensione Aruba 2026, verificato 11/07/2026)

### 3.2 Forfettario: specificità

- **No IVA**: le fatture non applicano IVA. Il XML deve riportare aliquota 0% con esenzione N2.2 (regime forfettario — operazioni non soggette, altri casi) o la dicitura in `<Causale>`.
- **No rivalsa INPS**: il forfettario non applica rivalsa.
- **Bollo virtuale**: calcolato automaticamente per fatture sopra 77,47 € verso privati consumatori. La piattaforma deve tracciare il totale bolli dovuti per il versamento annuale (codici tributo trimestrali 2521 (I trim.), 2522 (II), 2523 (III), 2524 (IV) — *verificare su Agenzia Entrate*).
- **Fatturato cumulato**: la piattaforma deve monitorare il fatturato annuo e avvisare al superamento della soglia di 85.000 € (perdita regime) e 100.000 € (perdita immediata).

---

## 4. Analisi concorrenti (per questa funzione)

Vedi `analisi_concorrenti.md` per dettagli completi. Sintesi per fatturazione:

| Concorrente | Fatturazione SDI | API | Conservazione | Prezzo |
|---|---|---|---|---|
| Fatture in Cloud | Completa, UX eccellente | Sì (for Devs) | Sì | 48-612 €/anno |
| Aruba | Completa, conservazione AgID | Sì (REST documentate) | Sì (AgID, 10 anni) | 25-100 €/anno |
| Fattura24 | Completa, integrazione e-commerce | Sì (pubbliche) | No (consiglia AE gratuita) | 48-384 €/anno |
| Fiscozen | Completa | No | Sì | 499 €/anno |
| Agenzia Entrate | Solo consultazione | No | Sì (gratuita, 15 anni) | Gratuito |

**Cosa possiamo fare meglio**: l'AI che suggerisce come compilare la fattura (precompilazione descrizione, categoria ATECO, rilevamento anomalie), e il collegamento diretto con previsione tasse e F24 — nessun concorrente collega la fattura al calcolo in tempo reale delle imposte dovute.

---

## 5. Opzioni tecniche

### Opzione A: Aruba Fatturazione (API REST)

| Dimensione | Valutazione |
|---|---|
| Come | Aruba Fatturazione Elettronica (~25-100 €/anno), API REST su fatturazioneelettronica.aruba.it/apidoc/docs. Supabase Edge Function → Aruba API per invio. Webhook o polling per ricezione. |
| Pro | Prezzo più basso, conservazione AgID inclusa, API REST documentate, brand affidabile, bundle con PEC |
| Contro | API meno ricche di FiC, UX del loro prodotto non integrabile, documentazione API da verificare in profondità, rate limit sconosciuti |
| Costi | ~25-100 €/anno (entro budget) |
| Rischi | API potrebbero avere limitazioni (es. webhook non supportati, solo polling) — da verificare (Q-001) |
| **Raccomandazione** | **Sì per single-tenant/MVP** — prezzo, API, conservazione. Verificare documentazione API prima di iniziare lo sviluppo. |

### Opzione B: Openapi SDI API (pay-per-use)

| Dimensione | Valutazione |
|---|---|
| Come | API SDI di Openapi (openapi.com), pay-per-use (invio da 0,015 €). Supabase Edge Function → Openapi API. |
| Pro | Nessun setup, paghi a consumo (ideale per SaaS multi-tenant), API REST flessibili, firma digitale automatica via API |
| Contro | Costo per-chiamata (per volumi alti diventa costoso), conservazione non inclusa (da gestire separatamente o usare AE gratuita), meno noto |
| Costi | ~0,015 €/invio — per 100 fatture/anno ~1,50 €; per SaaS con 100 tenant × 100 fatture = 150 €/anno |
| Rischi | Dipendenza da un provider più piccolo, conservazione da gestire |
| **Raccomandazione** | **Sì per SaaS futuro** — il modello pay-per-use scala naturalmente con il numero di tenant. Per single-tenant MVP, Aruba è più semplice. |

### Opzione C: Accreditamento proprio SDICoop

| Dimensione | Valutazione |
|---|---|
| Come | Accreditare la piattaforma direttamente come Ente Trasmettitore presso l'Agenzia delle Entrate. |
| Pro | Nessun intermediario, costo marginale per fattura, controllo completo |
| Contro | Processo di accreditamento lungo (mesi), requisiti tecnici stringenti (infrastruttura, sicurezza), oneroso per un solo founder, manutenzione continua |
| Costi | Tempo (mesi) + infrastruttura server + certificazione |
| Rischi | Elevato — non sostenibile da solo |
| **Raccomandazione** | **No** — non sostenibile per un solo founder. Rivalutare solo se il SaaS raggiunge scala significativa (1000+ tenant). |

### Decisione

**MVP: Aruba** (API REST + conservazione, entro budget). **SaaS futuro: Openapi** (pay-per-use, scala naturalmente). L'architettura astrae il provider dietro un'interfaccia, quindi il passaggio da Aruba a Openapi è uno swap, non un refactor.

---

## 6. Modello dati

### 6.1 Tabelle coinvolte (vedi `00_architettura_e_decisioni.md` §5 per schema completo)

```
clienti
  id, tenant_id, denominazione, piva, cf, codice_destinatario, pec_destinatario, indirizzo_json, created_at

fornitori
  -- stessa struttura di clienti, tabella separata

fatture
  id, tenant_id, numero, data, tipo ('attiva'|'passiva'),
  controparte_id, imponibile, descrizione,
  stato_sdi ('bozza'|'inviata'|'consegnata'|'scartata'|'ricevuta'),
  sdi_identificativo, xml_url, pdf_url, metadata (jsonb),
  bollo_virtuale (boolean, default false), importo_bollo (numeric, default 0),
  ateco_codice (text), -- per ripartizione multi-ATECO
  created_at
```

### 6.2 Relazioni

```
tenant 1───n clienti
tenant 1───n fornitori
tenant 1───n fatture
cliente/fornitore 1───n fatture (via controparte_id)
```

### 6.3 Invarianti

- `fatture.numero` è univoco per `tenant_id` + anno.
- `fatture.stato_sdi` segue una macchina a stati: `bozza → inviata → consegnata|scartata → ricevuta` (per passive: `ricevuta` diretto).
- `fatture.bollo_virtuale` = true se `imponibile > 77.47 AND controparte.tipo = 'privato'`.
- `fatture.ateco_codice` deve matchare uno dei codici del `profilo_fiscale` del tenant.

---

## 7. Logica e flussi

### 7.1 Flusso: creazione fattura attiva

```
1. Utente seleziona "Nuova fattura"
2. Compila: cliente (o nuovo), descrizione, importo, data
3. Sistema recupera codice destinatario SDI dal cliente
   - Se P.IVA: codice destinatario (7 char) o PEC
   - Se privato: XXXXXXX + PEC del privato (o codice destinatario generico)
4. Sistema calcola bollo virtuale (se importo > 77,47 € e cliente è privato)
5. Sistema genera XML FatturaPA:
   - Dicitura regime forfettario in <Causale>
   - Aliquota IVA 0% con esenzione N2.2
   - DatiBollo se applicabile
   - DatiTrasmissione con codice destinatario
6. Utente conferma → stato = 'bozza'
7. Utente clicca "Invia a SDI" → Edge Function chiama API provider
8. Provider restituisce sdi_identificativo → stato = 'inviata'
9. Webhook/polling: SDI notifica esito
   - Consegnata → stato = 'consegnata', salva ricevuta
   - Scartata → stato = 'scartata', mostra motivo errore XML
10. Conservazione: provider conserva automaticamente (Aruba) o export a AE gratuita
```

### 7.2 Flusso: ricezione fattura passiva

```
1. Provider riceve fattura da SDI per il nostro codice destinatario
2. Webhook (o polling ogni N minuti) → Edge Function scarica XML + metadati
3. Sistema crea record fattura tipo='passiva', stato='ricevuta'
4. Salva XML e PDF in Supabase Storage
5. Inserisce movimento contabile (tipo='costo', importo, data)
6. Notifica utente (in-app + alert email se commercialista AI attivo)
```

### 7.3 Flusso: migrazione da Fatture in Cloud

```
1. Script one-time (Supabase Edge Function o Node script locale)
2. Autenticazione OAuth2 su API Fatture in Cloud
3. Lettura clienti → insert in tabella clienti (tenant_id = founder)
4. Lettura fornitori → insert in tabella fornitori
5. Lettura fatture attive (paginata) → insert in tabella fatture tipo='attiva'
   - Mappa stati SDI di FiC ai nostri stati
   - Salva riferimento originale FiC in metadata.fic_id
6. Lettura fatture passive → insert in tabella fatture tipo='passiva'
7. Verifica: count FiC == count Supabase per ogni entità
8. FiC resta attivo, nessuna cancellazione
```

### 7.4 Pseudocodice: generazione XML

```
function generaXMLFattura(fattura, profilo, cliente):
  xml = {
    FatturaElettronica: {
      Header: {
        DatiTrasmissione: {
          IdTrasmittente: { IdPaese: 'IT', IdCodice: profilo.piva },
          ProgressivoInvio: fattura.numero,
          FormatoTrasmissione: 'FPR12',  # tra privati
          CodiceDestinatario: cliente.codice_destinatario,
          (ContattiTrasmittente: { email: profilo.pec })
        },
        CedentePrestatore: {
          DatiAnagrafici: {
            IdFiscaleIVA: { IdPaese: 'IT', IdCodice: profilo.piva },
            Anagrafica: { Denominazione: profilo.denominazione },
            RegimeFiscale: 'RF19'  # forfettario
          },
          Sede: { ...profilo.sede }
        },
        CessionarioCommittente: { ...cliente }
      },
      Body: {
        DatiGenerali: {
          DatiGeneraliDocumento: {
            TipoDocumento: 'TD01',
            Data: fattura.data,
            Numero: fattura.numero,
            Causale: 'Operazione senza IVA in regime forfettario, art. 1 c.54-89 L.190/2014',
            (DatiBollo: { BolloVirtuale: 1, ImportoBollo: 2.00 }) # se applicabile
          }
        },
        DatiBeniServizi: {
          DettaglioLinee: [{
            NumeroLinea: 1,
            Descrizione: fattura.descrizione,
            PrezzoTotale: fattura.imponibile,
            AliquotaIVA: 0.00,
            Natura: 'N2.2'  # regime forfettario (altri casi)
          }],
          DatiRiepilogo: {
            AliquotaIVA: 0.00,
            Natura: 'N2.2',
            ImponibileImporto: fattura.imponibile,
            Imposta: 0.00,
            EsigibilitaIVA: 'I'
          }
        }
      }
    }
  }
  return toXML(xml)  # conforme a schema XSD FatturaPA
```

---

## 8. Integrazioni & API

### 8.1 Provider SDI (Aruba — confermato MVP)

**Q-001 / FE-001 risolte (11/07/2026)** — verificata documentazione API v2 (fatturazioneelettronica.aruba.it/apidoc/v2/docs.html):

| Aspetto | Dettaglio |
|---|---|
| Endpoint base | `https://fatturazioneelettronica.aruba.it/` — REST, v1 (`/services/invoice/...`) e v2 (`/api/v2/...`) |
| Autenticazione | OAuth2 (bearer token) |
| Invio fattura | `POST /services/invoice/upload` (non firmata) / `POST /services/invoice/uploadSigned` (firmata) |
| Ricerca fatture inviate | `GET /api/v2/invoices-out` (lista) + `GET /api/v2/invoices-out/detail` (dettaglio) |
| Ricezione fatture | `GET /api/v2/invoices-in` — **supporta sia webhook/callback** (`createInvoice`, `updateInvoiceStatus`, `updateUsage` via POST su endpoint del cliente) **sia polling** |
| Conservazione | `GET /api/v2/invoices-out/pdd` e `/invoices-in/pdd` (pacchetto di conservazione), inclusa automaticamente (Aruba è conservatore AgID) |
| Comunicazioni finanziarie | `POST /api/v2/comfin` + `GET /api/v2/comfin/{requestId}` (liquidazioni IVA — non rilevante per forfettario ma presente) |
| Rate limit | **Confermato**: sistema a tier (0–6, da 60 a 30.000 richieste/ora), algoritmo leaky bucket, risposta HTTP 429 al superamento soglia |
| Piano richiesto | **FE-004 risolta**: i Web Services (API REST) sono riservati alle utenze **Premium** (o utenze base collegate via delega a un account Premium) — il piano base "1 GB / 29,90 €+IVA anno" non basta da solo, serve almeno un account Premium collegato |
| Documentazione | fatturazioneelettronica.aruba.it/apidoc/v2/docs.html |

**Nota prezzo**: il canone base è risultato 29,90 €+IVA/anno (non ~65 € come stimato inizialmente in fase di scoping) — margine ulteriore sul budget di 100 €/anno, anche considerando l'eventuale sovrapprezzo per l'utenza Premium necessaria alle API.

### 8.2 API Fatture in Cloud (migrazione)

| Aspetto | Dettaglio |
|---|---|
| Endpoint base | `https://api.fattureincloud.it/v2/...` |
| Autenticazione | OAuth2 (authorization code flow) |
| Lista clienti | GET /entities/clients |
| Lista fornitori | GET /entities/suppliers |
| Lista fatture emesse | GET /issued_documents (paginata, filtri per data) |
| Lista fatture ricevute | GET /received_documents |
| Rate limit | Rispettato, paginazione standard |

### 8.3 Interfaccia di astrazione

```
interface SDIProvider {
  inviaFattura(xml: string): Promise<{ sdiId: string }>
  getStatoFattura(sdiId: string): Promise<StatoSDI>
  riceviFatture(since: Date): Promise<FatturaPassiva[]>
  getFatturaRicevuta(id: string): Promise<{ xml: string, pdf: string }>
}
```

Implementazioni: `ArubaSDIProvider`, `OpenapiSDIProvider` (SaaS futuro).

---

## 9. Edge case & rischi

| Edge case | Impatto | Mitigazione |
|---|---|---|
| Fattura scartata da SDI (errore XML) | Utente bloccato, fattura non consegnata | Mostrare errore specifico SDI (codice errore + descrizione), permettere correzione e re-invio |
| Codice destinatario errato/inesistente | SDI non consegna | Validazione lato client prima dell'invio; fallback su PEC |
| Provider SDI down | Impossibile fatturare | Coda di invio (retry automatico), monitoraggio stato provider |
| Doppio invio (stessa fattura) | SDI scarta come duplicato | Idempotenza: check `numero + anno` prima di inviare |
| Fatturato cumulato supera 85.000 € | Perdita regime | Alert automatico a 75.000 € (soglia di preavviso) e 85.000 € |
| Bollo virtuale: fattura esattamente a 77,47 € | Caso limite | Soglia: > 77,47 (strettamente maggiore), documentato e testato |
| Cliente privato senza PEC e senza codice destinatario | Impossibile inviare | SDI supporta codice generico 0000000 (ma con limitazioni); guidare l'utente |
| Fattura passiva ricevuta mentre sistema offline | Fattura persa | Polling di recupero al riavvio; il provider conserva comunque |
| Migrazione parziale (API FiC fallisce a metà) | Dati inconsistenti | Transazione: rollback completo se fallisce; log dettagliato; riprendibile |
| Multi-ATECO: fattura non attribuita a un codice | Calcolo tasse errato | Campo `ateco_codice` obbligatorio in fase di creazione fattura |

---

## 10. Compliance

| Aspetto | Dettaglio |
|---|---|
| GDPR | Dati fiscali = categoria delicata. Base giuridica: esecuzione contratto (art. 6 c.1 b GDPR). Dati minimi: non memorizzare dati sanitari/sensibili nelle descrizioni fattura. |
| Conservazione | 10 anni obbligatori. Provider Aruba = conservatore AgID. Per SaaS: verificare se ogni tenant ha il proprio conservatore o se la piattaforma fa da tramite. |
| XML a norma | Conformità schema XSD FatturaPA versione vigente. Validazione pre-invio. |
| Bollo virtuale | Versamento cumulativo con codici trimestrali **confermati**: 2521 (I trim.), 2522 (II trim.), 2523 (III trim.), 2524 (IV trim.); esistono anche 2525 (sanzioni) e 2526 (interessi) per ravvedimento. Tracciamento importo totale annuo. |
| XSD FatturaPA | Specifiche tecniche v1.9 in vigore dal 1/4/2025; **v1.9.1 in vigore dal 15/05/2026** (nuovo codice controllo 00327, aggiornamento canali Web Service/SFTP, blocco AltriDatiGestionali). Usare v1.9.1 per fatture emesse da tale data. |
| Dati personali in fattura | Minimizzazione: descrizioni generiche, no dettagli non necessari (es. non menzionare prestazioni sanitarie). |

---

## 11. Dipendenze

| Dipende da | Per cosa |
|---|---|
| Setup Supabase (auth, DB, storage) | Tutto |
| Scelta provider SDI (Q-001) | Invio/ricezione fatture |
| Profilo fiscale del tenant (ATECO, regime) | Generazione XML corretta, calcolo bollo |
| Migrazione da FiC | Popolamento dati iniziale |

| Alimenta | Come |
|---|---|
| Previsione tasse | Fatture attive = ricavi; passive = costi (non deducibili ma tracciate) |
| Generazione F24 | Fatture → reddito imponibile → imposta sostitutiva + contributi |
| Dichiarazione redditi | Fatture → dati quadro LM |
| Commercialista AI | Fatture = contesto per Q&A ("ho fatturato X, cosa devo versare?") |

---

## 12. Domande aperte

| # | Domanda | Bloccante? |
|---|---|---|
| FE-001 | ~~Aruba API REST: documentazione completa accessibile? Rate limit? Webhook?~~ **Risolta**: sì, API v2 documentate, rate limit a tier (60-30.000 req/h, leaky bucket), webhook + polling entrambi supportati | No | Chiusa (11/07/2026) |
| FE-002 | ~~Codici tributo bollo virtuale: 2521-2524~~ **Risolta**: confermati (+ 2525 sanzioni, 2526 interessi) | No | Chiusa |
| FE-003 | ~~Versione XSD FatturaPA vigente~~ **Risolta**: v1.9 (dal 1/4/2025), v1.9.1 dal 15/05/2026 | No | Chiusa |
| FE-004 | ~~Aruba: il piano Base include le API REST o serve un piano superiore?~~ **Risolta**: serve utenza Premium (o base delegata da Premium) | No | Chiusa |

---

## 13. Next step

1. Risolvere FE-001: leggere la documentazione API Aruba su fatturazioneelettronica.aruba.it/apidoc/docs
2. Verificare FE-004: quale piano Aruba serve per le API
3. Progettare l'interfaccia `SDIProvider` e l'implementazione `ArubaSDIProvider`
4. Scrivere lo script di migrazione da Fatture in Cloud
5. Definire i template XML per TD01 (forfettario) e TD04 (nota di credito)
6. Implementare il polling/webhook di ricezione fatture passive
