# Neurora Fiscale (nome provvisorio)

Piattaforma fiscale per Partita IVA in regime forfettario: fatturazione elettronica, previsione tasse in tempo reale, generazione F24, pre-compilazione dichiarazione dei redditi e commercialista AI.

> Documenti di planning: `00_architettura_e_decisioni.md` + i 6 `.md` di dettaglio. Questo README copre solo l'avvio e la configurazione dell'app.

## Avvio rapido

```bash
npm install
npm run dev
```

L'app parte su `http://localhost:5173` in **modalità locale**: tutti i dati (profilo, clienti, fatture, F24, dichiarazioni, chat) vivono nel browser (localStorage). Nessuna chiave è richiesta per iniziare a lavorare: fatture, previsione tasse, F24, bollo, ravvedimento e quadro LM funzionano subito, perché i motori di calcolo sono deterministici e locali (D-005).

## Integrazioni esterne (chiavi inserite dall'utente)

Tutte si configurano nella pagina **Impostazioni** dell'app. Senza chiavi l'app funziona comunque: le funzioni esterne restano disabilitate con istruzioni su come attivarle.

| Servizio | A cosa serve | Cosa serve |
|---|---|---|
| **Aruba Fatturazione Elettronica** | Invio/ricezione fatture via SDI + conservazione | Username e password Aruba. Richiede utenza **Premium** (i Web Services non sono nel piano base). Fallback sempre disponibile: "Scarica XML" e upload manuale sul pannello Aruba |
| **LLM (Anthropic / OpenAI / Groq)** | Commercialista AI (chat con contesto fiscale calcolato) | Una chiave API del provider scelto. Consigliato: Anthropic Claude Haiku |
| **Resend + n8n** | Alert email proattivi su scadenze | Chiave Resend + URL webhook n8n (le automazioni girano su n8n/Hostinger, qui si conservano le chiavi) |
| **Fatture in Cloud** | Migrazione one-time di clienti e fatture (clonazione, FiC resta attivo) | Access token da developers.fattureincloud.it + Company ID |
| **Supabase** (opzionale) | Database cloud al posto del localStorage | `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` in `.env` + migrazione `supabase/migrations/001_schema.sql` |

### Nota CORS (Aruba / Fatture in Cloud)

Le chiamate dirette dal browser verso Aruba o Fatture in Cloud possono essere bloccate da CORS. In quel caso:

- **Aruba**: usa il pulsante "Scarica XML" e carica il file sul pannello Aruba, oppure instrada le chiamate attraverso una Supabase Edge Function proxy (stessa interfaccia `SDIProvider`, previsto post-MVP).
- **Fatture in Cloud**: esegui la migrazione una tantum disattivando temporaneamente il controllo CORS o via piccolo proxy locale.

## Struttura

```
src/
  engine/          Motori di calcolo deterministici (previsione, F24, bollo, quadro LM, ravvedimento)
  services/        Integrazioni esterne (XML FatturaPA, Aruba SDI, LLM, Fatture in Cloud)
  lib/             Layer dati (localStorage ↔ Supabase), impostazioni, hook
  pages/           Dashboard, Fatture, Clienti, Previsione, F24, Dichiarazione, Chat, Impostazioni
supabase/
  migrations/      Schema SQL multi-tenant-ready + seed dati normativi
```

## Principi (dal planning)

- **Calcolo deterministico separato dall'AI** (D-005): l'AI riceve i numeri dal motore, mai il contrario.
- **Fonti verificate, non memoria** (D-006): ogni parametro fiscale in `src/engine/datiNormativi.ts` ha fonte e data di verifica (11/07/2026). A ogni nuovo anno fiscale vanno riverificati.
- **Multi-tenant-ready** (D-001): `tenant_id` ovunque nello schema SQL; il passaggio a SaaS è uno switch.
- **La piattaforma non trasmette la dichiarazione** (D-002): pre-compila il Quadro LM e guida l'invio via Fisconline.
- **F24: generazione + istruzioni** (D-003): il pagamento avviene via home banking / F24 web.

## Comandi

```bash
npm run dev      # sviluppo
npm run build    # build produzione (tsc + vite)
npm run preview  # anteprima build
```

Deploy consigliato: Vercel (CI/CD automatico sul push).
