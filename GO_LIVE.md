# GO-LIVE — Checklist di chiusura progetto

> Stato: il codice è completo e la build passa (`npm run build`) e i test passano (`npm test`).
> Restano da fare: recuperare le credenziali/account esterni e il deploy. Questa guida spiega **esattamente come recuperare ogni cosa**.

---

## 1. Cosa è già pronto (non serve altro codice)

- ✅ Motori di calcolo deterministici (previsione, F24, bollo, ravvedimento, Quadro LM)
- ✅ Fatturazione elettronica (XML FatturaPA, invio SDI Aruba con fallback CORS via Edge Function)
- ✅ Previsione tasse + Dashboard + scadenze
- ✅ F24 con download PDF reale
- ✅ Dichiarazione Quadro LM con download PDF
- ✅ Commercialista AI (Anthropic/OpenAI/Groq/OpenRouter/Ollama + RAG news + web search)
- ✅ Migrazione one-time da Fatture in Cloud
- ✅ Auth Supabase (Google + email) opzionale
- ✅ Backup/ripristino dati (JSON)
- ✅ 44 test automatici sui motori di calcolo
- ✅ Alert scadenze via email (Edge Function `send-alerts` + workflow n8n importabile)

---

## 2. Credenziali da recuperare (in ordine di importanza)

### 2.1 Supabase (database + auth + Edge Functions) — consigliato ma opzionale
Senza Supabase l'app funziona in modalità locale (dati nel browser). Con Supabase ottieni: cloud, login e gli alert email.

**Come recuperarla:**
1. Vai su <https://supabase.com> → "New project" (gratuito).
2. Nel pannello **Project Settings → API** trovi:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** (segreta, per le Edge Function) → serve solo lato server, NON va nel frontend
3. In **SQL Editor** esegui in ordine le migrazioni in `supabase/migrations/`:
   `001_schema.sql` → `002_auth_rls.sql` → `003_news_fiscali.sql` → `004_chat_sessioni.sql`
4. Per l'auth: **Authentication → Providers** → attiva **Email** e **Google**.
5. Deploy delle Edge Function (richiede la Supabase CLI):
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref TUA-REF
   supabase functions deploy aruba-proxy
   supabase functions deploy send-alerts
   supabase functions deploy fic-migrate
   ```

### 2.2 Aruba Fatturazione Elettronica (invio fatture via SDI) — opzionale, c'è il fallback XML
Senza credenziali puoi comunque scaricare l'XML e caricarlo a mano sul pannello Aruba.

**Come recuperarla:**
1. Acquista/attiva **Aruba Fatturazione Elettronica** su <https://www.aruba.it> con utenza **Premium** (i Web Services NON sono nel piano base).
2. Nella pagina **Impostazioni → Fatturazione elettronica** dell'app inserisci username e password Aruba.
3. Le URL preimpostate (`auth.fatturazioneelettronica.aruba.it`, `ws.fatturazioneelettronica.aruba.it`) vanno bene di default.
4. Se l'invio diretto dal browser fallisce per CORS, l'app usa automaticamente l'Edge Function `aruba-proxy` (serve Supabase configurato).

### 2.3 Chiave LLM (Commercialista AI) — opzionale
Senza chiave la chat è disattivata.

**Come recuperarla (scegli un provider):**
- **Anthropic** (consigliato, Claude Haiku): <https://console.anthropic.com> → API Keys → crea chiave `sk-ant-...`.
- **OpenAI**: <https://platform.openai.com/api-keys> → `sk-...`.
- **Groq**: <https://console.groq.com/keys> → `gsk_...`.
- **OpenRouter** (un'unica chiave per tutti i modelli): <https://openrouter.ai/keys> → `sk-or-...`.
- **Ollama Cloud**: <https://ollama.com> → abbonamento Pro → chiave API.

Inserisci la chiave in **Impostazioni → Commercialista AI**.

### 2.4 Fatture in Cloud (migrazione one-time) — opzionale, solo al primo avvio
**Come recuperarla:**
1. Vai su <https://developers.fattureincloud.it> → "Crea app" (personale).
2. Ottieni un **Access Token** OAuth2.
3. Il **Company ID** è l'ID azienda (lo trovi nell'URL del pannello FiC o via API).
4. Inserisci entrambi in **Impostazioni → Migrazione**.

### 2.5 Resend (email alert) — opzionale, per gli alert proattivi
**Come recuperarla:**
1. Registrati su <https://resend.com> (gratuito fino a 100 email/giorno).
2. **API Keys** → crea chiave `re_...`.
3. Verifica il tuo dominio in **Domains** (per inviare da `alert@tuodominio.it`); per i test puoi usare `onboarding@resend.dev`.
4. La chiave NON va nel frontend: va usata nel workflow n8n (vedi sotto) o passata alla Edge Function `send-alerts`.

### 2.6 n8n (automazioni/alert schedulati) — opzionale
**Come configurarla:**
1. Installa n8n (consigliato: su Hostinger VPS, o <https://n8n.io> cloud).
2. Importa il workflow pronto: `n8n/alert-scadenze-workflow.json`.
3. Sostituisci i placeholder: URL Supabase, anon key, chiave Resend, email destinatario.
4. Attiva il workflow (cron giornaliero alle 08:00 già impostato).

---

## 3. Deploy su Vercel

1. Push del repository su GitHub.
2. Su <https://vercel.com> → "Add New Project" → importa il repo.
3. Vercel rileva Vite automaticamente (il file `vercel.json` è già incluso).
4. In **Settings → Environment Variables** aggiungi:
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (se usi Supabase)
5. Deploy. L'URL di produzione apparirà nella dashboard.

> Nota: le chiavi Aruba/LLM/Resend/FiC NON vanno nelle env vars di Vercel: restano nel browser dell'utente (localStorage) tramite la pagina Impostazioni.

---

## 4. Comandi

```bash
npm run dev        # sviluppo locale
npm test           # esegue i 44 test sui motori di calcolo
npm run build      # build di produzione (tsc + vite)
npm run preview    # anteprima della build
```

---

## 5. Decisioni ancora aperte (non bloccanti)

| Punto | Note |
|---|---|
| **Nome prodotto** | ✅ Deciso: "VELTRA by Neurora" (ex "Neurora Fiscale"). |
| **Palette** | Ora si usano i colori Neurora di default (Q-005). |
| **REA** | "MT-87391" da confermare su visura camerale aggiornata (la sede è in PV, non MT). |
| **ATECO secondario** | 62.01.00 da confermare come registrato nel RI. |
| **Provider LLM definitivo** | Raccomandato Claude Haiku 4.5 (CA-001). |

---

## 6. Verifiche finali prima di dichiarare "chiuso"

1. `npm test` → 44/44 passano.
2. `npm run build` → nessun errore TypeScript.
3. Smoke test manuale: crea una fattura → genera XML → (se Aruba configurato) invia SDI → verifica F24 → scarica PDF → verifica Quadro LM.
4. Backup: **Impostazioni → Esporta JSON** e conserva il file.
5. Riverifica annuale dei parametri in `src/engine/datiNormativi.ts` (data verifica 11/07/2026 — principio D-006).
