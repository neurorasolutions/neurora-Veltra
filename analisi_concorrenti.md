# Analisi Concorrenti

> **Progetto**: Piattaforma fiscale Neurora (nome provvisorio)
> **Data**: 11 luglio 2026
> **Fonti**: Siti ufficiali verificati a luglio 2026; dove un dato non è verificabile è marcato *da confermare*

---

## 1. Panoramica del mercato

Il mercato italiano del software fiscale per piccoli professionisti e forfettari è maturo e affollato. Si divide in:

- **Gestionali completi** (fatturazione + contabilità + dichiarativi): Fatture in Cloud, Fattura24, TeamSystem
- **Servizi con commercialista dedicato**: Fiscozen
- **Provider infrastrutturali** (PEC + fatturazione + conservazione): Aruba
- **Strumenti gratuiti dell'Agenzia delle Entrate**: Fisconline, software dichiarativi

La piattaforma Neurora si posiziona in uno spazio non occupato: **gestionale fiscale con AI proattiva integrata** — non un software passivo che aspetta input, ma un assistente che monitora, calcola in tempo reale, avverte per email e risponde a domande fiscali con fonti verificate.

---

## 2. Fatture in Cloud (TeamSystem)

| Dimensione | Dettaglio |
|---|---|
| **Sito** | fattureincloud.it |
| **Proprietario** | TeamSystem S.p.A. |
| **Cosa fa** | Fatturazione elettronica attiva/passiva, prima nota, scadenzario, gestione magazzino, report, dichiarativi (in upgrade), app mobile |
| **Prezzi (verificati 07/2026)** | Forfettari: 4 €/mese (48 €+IVA/anno) · Standard: 12 €/mese (144 €+IVA/anno) · Premium: 21 €/mese (252 €+IVA/anno) · Premium Plus: 29 €/mese (348 €+IVA/anno) · Complete: 51 €/mese (612 €+IVA/anno) |
| **Costi extra** | Commissione una tantum 1 €+IVA (carta/PayPal) o 2,50 €+IVA (bonifico) |
| **Prova gratuita** | 31 giorni, tutte le funzioni Premium Plus tranne fatturazione elettronica |
| **Punti di forza** | UX moderna e curata, app mobile eccellente, API ufficiali (Fatture in Cloud for Devs), integrazione TS Pay, marca leader di mercato |
| **Punti di debolezza** | Nessun AI integrata (TeamSystem AI "in arrivo" solo su piano Complete), nessuna previsione tasse in tempo reale per forfettari, nessun commercialista AI, prezzo sale rapidamente con le funzioni |
| **Cosa possiamo fare meglio con l'AI** | Previsione tasse in tempo reale (loro non ce l'hanno), commercialista AI proattivo con RAG su fonti ufficiali, alert email automatici su scadenze e soglie, compilazione assistita di F24 e dichiarazione |

**Fonte**: fattureincloud.it/costo/ (verificato 11/07/2026)

---

## 3. Aruba Fatturazione

| Dimensione | Dettaglio |
|---|---|
| **Sito** | aruba.it/servizi/pec/fatturazione-elettronica.aspx · fatturazioneelettronica.aruba.it |
| **Proprietario** | Aruba S.p.A. |
| **Cosa fa** | Fatturazione elettronica SDI (attiva/passiva), conservazione sostitutiva AgID 10 anni, PEC inclusa nei piani superiori, app mobile, primanota |
| **Prezzi (verificati 07/2026)** | Base: ~25-35 €/anno · Standard: ~50-70 €/anno · Pro (con PEC): ~80-100 €/anno · *Prezzi indicativi IVA esclusa, possono variare con promozioni* |
| **API REST** | Sì — documentate su fatturazioneelettronica.aruba.it/apidoc/docs. Permettono invio fatture a SDI, ricerca fatture inviate/ricevute, comunicazioni finanziarie (liquidazioni IVA, dati fatture) |
| **Conservazione** | Conservatore accreditato AgID, 10 anni inclusi in tutti i piani |
| **Punti di forza** | Prezzo più basso del mercato, conservazione AgID inclusa, API REST disponibili, bundle con PEC, brand consolidato |
| **Punti di debolezza** | UX meno moderna, nessuna AI, nessuna previsione tasse, nessuna dichiarazione redditi, nessun commercialista, integrazioni limitate (no e-commerce), supporto self-service |
| **Cosa possiamo fare meglio con l'AI** | Tutto il layer di intelligenza: previsione, alert, Q&A fiscale. Aruba è puro infrastruttura. Noi possiamo usare Aruba come backend SDI e costruire l'AI sopra |

**Fonte**: centrofiscale.com/aruba-fatturazione-recensione-2026/ (verificato 11/07/2026); API REST confermata via DuckDuckGo snippet da fatturazioneelettronica.aruba.it/apidoc/docs

---

## 4. Fiscozen

| Dimensione | Dettaglio |
|---|---|
| **Sito** | fiscozen.it |
| **Proprietario** | Fiscozen S.p.A. |
| **Cosa fa** | Servizio "tutto incluso" con commercialista dedicato (umano): fatturazione, dichiarazione redditi, F24, scadenze, supporto via chat |
| **Prezzi (verificati 07/2026)** | Forfettario (mensile): 49,9 €/mese (~599 €/anno) · Forfettario (annuale): 499 €/anno IVA inclusa · Semplificato (mensile): 119,9 €/mese · Semplificato (annuale): 1199 €/anno IVA esclusa |
| **Punti di forza** | Commercialista umano dedicato, gestione completa delegata, zero pensieri, UX moderna |
| **Punti di debolezza** | Costoso (10× il piano forfettari di FiC), nessuna AI (il commercialista è umano, non scalabile), nessuna previsione tasse in tempo reale, non è un software da usare direttamente ma un servizio gestito |
| **Cosa possiamo fare meglio con l'AI** | Replicare l'esperienza "commercialista dedicato" con AI a costo near-zero, previsione tasse in tempo reale, alert proattivi — tutto a una frazione del prezzo (100 €/anno vs 499 €/anno) |

**Fonte**: fiscozen.it/prezzi/ (verificato 11/07/2026)

---

## 5. Fattura24

| Dimensione | Dettaglio |
|---|---|
| **Sito** | fattura24.com |
| **Cosa fa** | Fatturazione elettronica, prima nota, report, gestione magazzino, integrazione Sistema TS, API pubbliche (Prestashop, Shopify, WooCommerce, Zapier) |
| **Prezzi (verificati 07/2026)** | Professional: 4 €/mese (48 €+IVA primo anno, poi 120 €+IVA/anno) · Business: 12 €/mese (144 €+IVA primo anno, poi 192 €+IVA/anno) · Complete: 24 €/mese (288 €+IVA primo anno, poi 384 €+IVA/anno) |
| **Conservazione** | Non inclusa — consiglia la conservazione gratuita dell'Agenzia delle Entrate (15 anni) |
| **Punti di forza** | Prezzo basso primo anno, API pubbliche per e-commerce, video-formazione, supporto telefonico |
| **Punti di debolezza** | Conservazione non inclusa (va gestita separatamente), prezzo raddoppia al rinnovo, nessuna AI, nessuna previsione tasse, nessuna dichiarazione redditi |
| **Cosa possiamo fare meglio con l'AI** | Previsione tasse, F24 automatico, commercialista AI. Fattura24 è puro strumento di fatturazione senza alcun layer intelligente |

**Fonte**: fattura24.com/prezzi/ (verificato 11/07/2026)

---

## 6. TeamSystem (linea estesa)

| Dimensione | Dettaglio |
|---|---|
| **Sito** | teamsystem.com |
| **Cosa fa** | Suite ERP/contabile enterprise: contabilità generale, bilanci, dichiarativi, gestionali verticali (ristorazione, retail, costruzioni) |
| **Prezzi** | Modulare, da centinaia a migliaia di euro/anno per modulo. *Da confermare — pricing enterprise non pubblicato in modo trasparente* |
| **Punti di forza** | Completezza contabile estrema, versione enterprise per studi commerciali, dichiarativi nativi |
| **Punti di debolezza** | Complesso, costoso, overkill per un forfettario, curva di apprendimento ripida, nessuna AI (TeamSystem AI "in arrivo" solo su FiC Complete) |
| **Cosa possiamo fare meglio con l'AI** | Semplicità radicale per il forfettario, setup in minuti non in settimane, AI integrata non "in arrivo" |

**Fonte**: teamsystem.com (accesso 11/07/2026); pricing non verificato in modo trasparente

---

## 7. Strumenti gratuiti Agenzia delle Entrate

| Dimensione | Dettaglio |
|---|---|
| **Sito** | agenziaentrate.gov.it |
| **Cosa fa** | Fisconline (dichiarazioni telematiche), software Redditi PF (compilazione), Area fatturazione elettronica (consultazione), conservazione gratuita (15 anni), scadenziario online |
| **Prezzi** | Gratuito |
| **Punti di forza** | Ufficiale, gratuito, autorità normativa, conservazione 15 anni gratuita |
| **Punti di debolezza** | UX governativa (complessa, poco guidata), nessuna automazione, nessuna previsione, nessuna AI, nessun alert, bisogna sapere cosa fare |
| **Cosa possiamo fare meglio con l'AI** | Tutto il layer di usabilità e automazione che manca: guidare l'utente attraverso i passaggi, pre-compilare automaticamente dai dati di fatturazione, spiegare in linguaggio naturale cosa fare e quando. L'Agenzia fornisce i mattoni; noi costruiamo la casa e l'assistente che ci abita |

**Fonte**: agenziaentrate.gov.it (accesso 11/07/2026)

---

## 8. Tabella comparativa di pricing

| Prodotto | Piano entry | Prezzo/anno (IVA inclusa) | Fatturazione | Conservazione | Dichiarazione | AI | Previsione tasse |
|---|---|---|---|---|---|---|---|
| Fatture in Cloud | Forfettari | ~58 € | Sì | Sì | No | No (in arrivo) | No |
| Fattura24 | Professional | ~58 € (poi ~146 €) | Sì | No (gratis AE) | No | No | No |
| Aruba | Base | ~30-43 € | Sì | Sì (AgID) | No | No | No |
| Fiscozen | Forfettario annuale | 499 € | Sì | Sì | Sì (umano) | No | No |
| TeamSystem | Enterprise | centinaia €+ | Sì | Sì | Sì | No | No |
| Agenzia Entrate | Gratuito | 0 € | Consultazione | Sì (15 anni) | Compilazione | No | No |
| **Neurora (target)** | Single-tenant | ~100 € (infra) | Sì (via provider) | Sì (via provider) | Pre-compilazione | **Sì** | **Sì** |

---

## 9. Posizionamento e fattore differenziante di Neurora

### 9.1 Posizionamento

Neurora non compete sul prezzo (Aruba è già il più economico) né sulla completezza contabile (TeamSystem domina). Compete sull'**intelligenza proattiva**:

```
                    Prezzo basso ←————————→ Prezzo alto
                ┌──────────────────────────────────────┐
   Passive      │  Aruba    Fattura24   FiC            │  ← software che aspetta input
   (tool)       │                                        │
                │──────────────────────────────────────│
   Active       │  **Neurora**         Fiscozen         │  ← assistente che agisce per te
   (assistant)  │  (AI)                (umano)          │
                └──────────────────────────────────────┘
```

### 9.2 Fattore differenziante

**"Il commercialista AI che lavora mentre tu fatturi"** — tre pilastri che nessun concorrente offre insieme:

1. **Previsione tasse in tempo reale**: ogni fattura emessa o ricevuta aggiorna istantaneamente il calcolo di imposta sostitutiva e contributi INPS. Dashboard che risponde "quanto devo versare a giugno? E a novembre?" in ogni momento. Nessun concorrente lo fa per i forfettari.

2. **Commercialista AI con RAG e fonti verificate**: Q&A in linguaggio naturale su questioni fiscali, con risposte ancorate a fonti ufficiali (Agenzia Entrate, INPS, Normattiva) e citazione della fonte. Fiscozen ha un commercialista umano (costoso, non scalabile); FiC non ha nulla. L'AI è il "commercialista" scalabile a costo near-zero.

3. **Alert proattivi via email**: la piattaforma monitora scadenze, soglie (85k), ravvedimenti e avvisa prima che sia troppo tardi. Nessun concorrente invia alert intelligenti contestualizzati — al massimo mandano reminder generici.

### 9.3 Vantaggio competitivo sostenibile

L'AI alone non è un fossato — ogni concorrente può aggiungere un chatbot. Il fossato è:
- **Integrazione verticale**: fatturazione + calcolo + previsione + F24 + AI come sistema unico, non widget separati.
- **Fonti verificate e aggiornate**: il RAG su normativa italiana è un data asset che si costruisce nel tempo e si aggiorna automaticamente.
- **Brand Neurora**: già conosciuto come agenzia AI/automazione per PMI — la fiducia sul layer AI è preesistente.
- **Costo**: target ~100 €/anno vs 499 €/anno di Fiscozen, con valore superiore ai tool passivi allo stesso prezzo.

### 9.4 Rischi competitivi

- **TeamSystem aggiunge AI a FiC**: se TeamSystem implementa un AI assistant su Fatture in Cloud, il vantaggio si riduce. Mitigazione: velocità di esecuzione e focus sul forfettario (TeamSystem serve tutti, nessuno in profondità).
- **Fiscozen aggiunge AI**: potrebbe farlo, ma il loro modello è "commercialista umano" — l'AI cannibalizzerebbe il loro pricing. Mitigazione: posizionamento diverso (tool self-service + AI vs servizio gestito).
- **Agenzia Entrate migliora i tool gratuiti**: unlikely nel breve termine, ma possibile. Mitigazione: integrarsi con i loro tool (usare la loro conservazione gratuita, inviare tramite Fisconline) invece di competere frontalmente.

---

## 10. Domande aperte

| # | Domanda | Note |
|---|---|---|
| C-001 | Verificare prezzo esatto Aruba Fatturazione 2026 per il piano con API REST | Prezzo indicativo 25-100 €/anno da recensione; verificare su aruba.it |
| C-002 | Verificare disponibilità e limiti delle API REST Aruba (rate limit, webhook) | Documentazione su fatturazioneelettronica.aruba.it/apidoc/docs |
| C-003 | Openapi SDI API: confermare prezzo per-request (0,015 €/invio da DDG) | Per SaaS futuro, pay-per-use può essere più economico di un abbonamento fisso |
| C-004 | Strategia go-to-market SaaS: freemium, trial, o invito? | Da decidere in fase successiva |

---

## 11. Next step

1. Risolvere C-001 e C-002 per definire il provider SDI (vedi `fatturazione_elettronica.md`).
2. Confermare il posizionamento "AI proattiva" come leva principale.
3. Usare questa analisi come input per la sezione "Analisi concorrenti" di ogni `.md` di funzionalità.
