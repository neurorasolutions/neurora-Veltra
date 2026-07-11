# CHANGELOG — Correzioni al planning

> Data: 11 luglio 2026
> Fonte: file di correzioni fornito dal founder

---

## Modifiche applicate

### A. Dati anagrafici (bloccante)
- **Sede**: Grassano (MT), Via XXIV Maggio 62, 75024 → **Cilavegna (PV), Via Vernazzola 11/c, 27024** (Confermato dal founder)
- **REA**: MT - 87391 → marcato come "da verificare su visura aggiornata"
- **Fonte**: Visura Camerale → Confermato dal founder (per riga Sede e REA)
- **Frontespizio JSON** in `dichiarazione_redditi.md` §6.2: aggiornato indirizzo a Cilavegna (PV)
- P.IVA e CF: invariati (corretti)

### B1. Acconti 40/60 → 50/50 (bloccante)
- `previsione_tasse.md`: §3.4 tabella scadenze, regole acconto, dashboard §7.2, pseudocodice §7.1 — tutte le menzioni 40%/60% → 50%/50%
- `generazione_f24.md`: §2 In scope, §3.3 logica, §7.1/§7.2 flussi, §7.3 pseudocodice (`* 0.40` → `* 0.50`), commenti split 40/60 → 50/50
- `dichiarazione_redditi.md`: allineato (nessuna menzione residua di 40/60 per acconti)
- Aggiunta nota: primo anno di regime forfettario non è dovuto acconto
- Aggiunta in `dati_normativi`: `acconto_prima_rata = 0.50`, `acconto_seconda_rata = 0.50` (fonte: art. 58 DL 124/2019; ris. AdE 93/E 12/11/2019)

### B2. Contributi per cassa (versati) non maturati (bloccante)
- `dichiarazione_redditi.md` §7.3: pseudocodice `compilaQuadroLM` ora legge versamenti reali (`getContributiVersatiAnno`) invece di calcolare `redditoImponibile * aliquota_inps`
- `previsione_tasse.md`: aggiunta Nota 2 che distingue "stima previsionale" (INPS maturato) da "dato dichiarativo" (INPS versato per cassa)

### C1. Natura IVA: N2 → N2.2 (bloccante per conformità XML)
- `fatturazione_elettronica.md` §3.2, §5 Opzione A (pseudocodice §7.4): `Natura: 'N2'` → `Natura: 'N2.2'` (operazioni non soggette, altri casi)
- Aggiunta in `dati_normativi`: `natura_iva_forfettario = N2.2`

### C2. Ravvedimento: base sanzione 25% (non bloccante per MVP)
- `generazione_f24.md` §3.5: aggiunta nota base sanzione 25% (D.Lgs. 87/2024, dal 1/9/2024); tabella aggiornata; modulo marcato per revisione dedicata
- Aggiunta in `dati_normativi`: `sanzione_base_omesso_versamento = 0.25`

### C3. Codici bollo: 2506 → 2521-2524 (non bloccante)
- `fatturazione_elettronica.md` §3.2, §10, FE-002: codice 2506 → codici trimestrali 2521 (I), 2522 (II), 2523 (III), 2524 (IV)
- `generazione_f24.md` F24-002: aggiornato
- Aggiunta in `dati_normativi`: `codice_tributo_bollo_I_trim` ... `IV_trim`

### C4. Rateizzazione (non bloccante)
- `generazione_f24.md` §2 In scope, §3.3: "6 rate a novembre, 0,40% × n rate" → "fino al 16 dicembre, 4% annuo"
- Edge case §9: formula interessi aggiornata a 4% / 12 × n rate
- Aggiunta in `dati_normativi`: `tasso_rateizzazione_f24 = 0.04`

### C5. Scadenza Modello Redditi PF 2026 (non bloccante)
- `dichiarazione_redditi.md` §3.4, §7.2, DR-002: 31 ottobre → 2 novembre 2026 (31/10 cade di sabato, slitta al primo lunedì)
- DR-002 chiusa

### C6. Glitch testuale (non bloccante)
- `dichiarazione_redditi.md` §2, §3.3: "monitoraggio fulmini" → "monitoraggio di attività e investimenti esteri"

### D1. Contraddizione API REST Aruba
- `00_architettura_e_decisioni.md` §6.1: "Non ha API REST pubbliche documentate" → "API REST documentate su fatturazioneelettronica.aruba.it/apidoc/docs"

### E. Domande aperte chiuse
- Q-002 / PT-001 / PT-002 (coefficienti ATECO): **chiuse** — 67% confermato (allegato 2 L.190/2014)
- Q-008 / PT-004 (soglia reddito dipendente): **chiusa** — 35.000 € per 2026
- Q-009 / PT-003 (massimale INPS): **chiusa** — non rilevante per forfettario (reddito max ~56.950 €)
- DR-002 (scadenza Redditi): **chiusa** — 2 novembre 2026

### F. Azioni finali
- `dati_normativi` popolato con 27 parametri verificati (fonte_url + data_verifica)
- Registro decisioni: aggiunte D-011..D-018
- Registro domande aperte: chiuse Q-002, Q-008, Q-009
- Controllo di coerenza eseguito: nessun residuo di 40/60, N2 senza .2, Grassano/MT, fulmini, 2506, o "Aruba senza API"
- CHANGELOG.md creato

---

## Punti rimasti "da verificare" (stato al 11/07/2026, prima del secondo giro di verifiche)

| Punto | File | Note |
|---|---|---|
| FE-001 | fatturazione_elettronica.md | Rate limit / webhook Aruba API (bloccante per sviluppo) |
| FE-003 | fatturazione_elettronica.md | Versione XSD FatturaPA vigente luglio 2026 |
| DR-001 | dichiarazione_redditi.md | Specifiche formato file telematico Redditi PF 2026 |
| F24-001 | generazione_f24.md | Codice INPS Gestione Separata esatto sul prospetto di liquidazione |
| F24-003 | generazione_f24.md | Tasso legale annuo 2026 (interessi ravvedimento) |
| Codici bollo 2521-2524 | dati_normativi | Marcati "da verificare su AdE" — confermare codici esatti |
| REA / CCIAA | 00_architettura_e_decisioni.md | Da verificare su visura aggiornata (sede è in PV, non MT) |
| ATECO 62.01.00 nel RI | 00_architettura_e_decisioni.md | Visura allegata è vecchia (2018); verificare registrazione secondario |

---

## Secondo giro di verifiche — 11/07/2026 (ricerca web)

### G1. Q-001 / FE-001 / FE-002 / FE-003 / FE-004 — Aruba API SDI (bloccante, ora chiusa)
- Verificata documentazione API v2 Aruba (fatturazioneelettronica.aruba.it/apidoc/v2/docs.html): REST, OAuth2, endpoint invio/ricerca/ricezione/conservazione/comfin
- Rate limit confermato: sistema a tier (60-30.000 richieste/ora), leaky bucket, HTTP 429
- Webhook/callback **e** polling entrambi supportati
- Piano richiesto: utenza **Premium** (o base delegata) per accedere ai Web Services — non incluso nel solo piano base
- Prezzo base rivisto: 29,90 €+IVA/anno (non ~65 €) — margine aggiuntivo sul budget 100 €/anno
- XSD FatturaPA: v1.9 (dal 1/4/2025), **v1.9.1 dal 15/05/2026** (nuovo codice controllo 00327, canali Web Service/SFTP aggiornati)
- Codici bollo confermati: 2521-2524 (trimestrali) + 2525 (sanzioni) + 2526 (interessi)
- `00_architettura_e_decisioni.md` §6.1, §9 (Q-001 chiusa), D-019 aggiunta
- `fatturazione_elettronica.md` §8.1, §10, §12 (FE-001/002/003/004 chiuse)

### G2. F24-001 / F24-003 — Codici F24 e tasso legale (non bloccanti, ora chiuse)
- Codice INPS Gestione Separata confermato: **P10** (sezione INPS, saldo+2 acconti; "R" per rateizzazione, "DPPI" per interessi da differimento)
- Tasso legale 2026 confermato: **1,60%** dal 1/1/2026 (DM Economia 10/12/2025, G.U. 13/12/2025 n.289)
- `generazione_f24.md` §12 (F24-001/002/003 chiuse)
- `dati_normativi`: `tasso_legale_2026 = 0.0160`, `codice_inps_gestione_separata_2026 = P10`

### G3. PT-005 / DR-005 — Decisioni tecniche minori (non bloccanti, ora chiuse)
- Metodo acconto default: **storico** (100% versamenti anno precedente); previsionale solo primo anno o su scelta utente → D-020
- Dichiarazione redditi MVP: **solo pre-compilazione a video + PDF**, no file telematico ufficiale (rimandato, richiede specifiche Entratel complesse) → D-021

### G4. CA-001 / CA-003 — Commercialista AI (non bloccanti, lasciate aperte con raccomandazione)
- Non chiuse: sono MVP-4, il founder ha tempo per decidere
- Raccomandazione provvisoria aggiunta: LLM = Claude Haiku 4.5 (o GPT-4o-mini in alternativa), email = Resend

### G5. Visura camerale e nome prodotto — lasciati aperti su richiesta del founder
- REA e ATECO secondario: founder ha scelto di procedere con i dati attuali e verificare più avanti con visura aggiornata
- Nome prodotto: founder ha scelto di rimandare alla fase di design/branding (nessun impatto tecnico)

---

## Fix pre-integrazione SDI (12/07/2026)

### Bug 1 — BolloVirtuale XML: `SI` → `1`
- **File**: `src/services/fatturapa.ts:97`
- **Problema**: `<BolloVirtuale>SI</BolloVirtuale>` non è valido per lo schema XSD FatturaPA (accetta solo `0` o `1`). SDI scarterebbe la fattura.
- **Fix**: `<BolloVirtuale>1</BolloVirtuale>`

### Bug 2 — Ravvedimento sprint: formula sanzione errata
- **File**: `src/engine/f24.ts:182`
- **Problema**: `(base / 10 / 15) * giorni` = base/150 per giorno. La norma (art. 13 DL 472/1997) dice 1/200 della sanzione base per giorno. Per 14 giorni: il codice dava 2,33% invece di 1,75%.
- **Fix**: `(base / 200) * giorniRitardo`

### Miglioramenti TypeScript — eliminazione `any`
- `src/services/sdi.ts`: aggiunta `testConnection()` all'interfaccia `SDIProvider`; `riceviFatture` ora usa `FatturaRicevutaAruba` tipata invece di `any[]`.
- `src/pages/Impostazioni.tsx`: `(arubaProvider as any).getToken()` → `arubaProvider.testConnection()`.
- `src/services/llm.ts`: `data.data as any[]` → tipizzato come `{ id: string; name?: string }[]`.

### Planning doc allineato
- `generazione_f24.md`: formula ravvedimento sprint chiarita (`importo x (0,25/200) x giorni`).
