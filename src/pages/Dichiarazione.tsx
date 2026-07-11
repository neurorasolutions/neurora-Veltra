import { useMemo, useState } from 'react'
import { useProfilo, useTable } from '../lib/hooks'
import { Dichiarazione as Dich, F24Doc, Fattura } from '../types'
import { fmtEuro } from '../engine/fiscale'
import { compilaQuadroLM } from '../engine/quadroLM'

export default function Dichiarazione() {
  const { profilo } = useProfilo()
  const { rows: fatture } = useTable<Fattura>('fatture')
  const { rows: f24docs } = useTable<F24Doc>('f24_generati')
  const { rows: dichiarazioni, insert, update } = useTable<Dich>('dichiarazioni')

  const annoCorrente = new Date().getFullYear()
  const [anno, setAnno] = useState(annoCorrente - 1)

  // Suggerimento dai versamenti tracciati: F24 pagati nell'anno d'imposta (per cassa)
  const versamentiSuggeriti = useMemo(() => {
    const pagati = f24docs.filter((d) => d.stato === 'pagato')
    let inps = 0
    let acconti = 0
    for (const d of pagati) {
      for (const r of d.righe) {
        const annoVersamento = new Date(d.data_scadenza).getFullYear()
        if (r.sezione === 'inps' && annoVersamento === anno) inps += r.importo
        if (r.sezione === 'erario' && ['1791', '1792'].includes(r.codice) && r.anno === String(anno))
          acconti += r.importo
      }
    }
    return { inps, acconti }
  }, [f24docs, anno])

  const [contributiVersati, setContributiVersati] = useState<number | null>(null)
  const [accontiVersati, setAccontiVersati] = useState<number | null>(null)

  const cv = contributiVersati ?? versamentiSuggeriti.inps
  const av = accontiVersati ?? versamentiSuggeriti.acconti

  const quadro = useMemo(
    () => (profilo ? compilaQuadroLM(fatture, profilo, anno, cv, av) : null),
    [fatture, profilo, anno, cv, av]
  )

  const esistente = dichiarazioni.find((d) => d.anno_imposta === anno)

  async function salva() {
    if (!quadro) return
    const dati = {
      anno_imposta: anno,
      stato: 'precompilata' as const,
      quadro_lm: Object.fromEntries(quadro.righe.map((r) => [r.rigo, r.valore])),
      note: `Contributi versati: ${cv} € · Acconti versati: ${av} €`,
    }
    if (esistente) await update(esistente.id, dati)
    else await insert(dati)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Dichiarazione dei redditi</h1>
          <p className="text-sm text-slate-500">
            Pre-compilazione Quadro LM (forfettari) — l'invio resta a tuo carico via Fisconline con SPID (D-002).
          </p>
        </div>
        <select className="input !w-32" value={anno} onChange={(e) => setAnno(Number(e.target.value))}>
          {[annoCorrente - 1, annoCorrente - 2, annoCorrente].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </header>

      <section className="card grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Contributi INPS versati nel {anno} (€) — principio di cassa</label>
          <input
            className="input num"
            type="number"
            step="0.01"
            min="0"
            value={cv}
            onChange={(e) => setContributiVersati(Number(e.target.value))}
          />
          <p className="text-xs text-slate-400 mt-1">
            Suggerito dai tuoi F24 pagati: {fmtEuro(versamentiSuggeriti.inps)}. Si deducono i contributi{' '}
            <em>versati</em> nell'anno, non i maturati (D-012).
          </p>
        </div>
        <div>
          <label className="label">Acconti d'imposta versati per il {anno} (€)</label>
          <input
            className="input num"
            type="number"
            step="0.01"
            min="0"
            value={av}
            onChange={(e) => setAccontiVersati(Number(e.target.value))}
          />
          <p className="text-xs text-slate-400 mt-1">
            Suggerito dai tuoi F24 pagati (codici 1791/1792 anno {anno}): {fmtEuro(versamentiSuggeriti.acconti)}.
          </p>
        </div>
      </section>

      {quadro && (
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Quadro LM — anno d'imposta {anno}</h2>
            <div className="no-print space-x-2">
              <button className="btn-secondary" onClick={() => window.print()}>🖨 Stampa</button>
              <button className="btn-primary" onClick={salva}>
                {esistente ? 'Aggiorna dichiarazione' : 'Salva come pre-compilata'}
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Rigo</th>
                <th className="th">Descrizione</th>
                <th className="th text-right">Valore</th>
              </tr>
            </thead>
            <tbody>
              {quadro.righe.map((r, i) => (
                <tr key={i}>
                  <td className="td num font-bold">{r.rigo}</td>
                  <td className="td">{r.descrizione}</td>
                  <td className="td num text-right">
                    {typeof r.valore === 'number' ? fmtEuro(r.valore) : r.valore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            className={`mt-4 p-4 rounded-xl text-sm font-bold ${
              quadro.saldo >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {quadro.saldo >= 0
              ? `Saldo a debito: ${fmtEuro(quadro.saldo)} — da versare con F24 (codice 1790) entro il 30/6 dell'anno successivo.`
              : `Credito d'imposta: ${fmtEuro(Math.abs(quadro.saldo))} — compensabile in F24 o riportabile.`}
          </div>
          {esistente && (
            <p className="text-xs text-slate-400 mt-2">
              Stato: <span className="badge bg-blue-100 text-blue-700">{esistente.stato}</span>
            </p>
          )}
        </section>
      )}

      <section className="card text-sm space-y-2">
        <h2 className="font-bold">Istruzioni per l'invio (Fisconline)</h2>
        <ol className="list-decimal ml-5 space-y-1 text-slate-600">
          <li>Accedi a <strong>agenziaentrate.gov.it</strong> con SPID/CIE e apri la dichiarazione Redditi PF precompilata (o compila il modello Redditi PF).</li>
          <li>Compila il <strong>Quadro LM</strong> (sezione forfettari) con i valori riportati sopra.</li>
          <li>Compila il <strong>Quadro RR</strong> (contributi INPS Gestione Separata) — i dati coincidono con la sezione INPS dei tuoi F24.</li>
          <li>Verifica eventuali quadri aggiuntivi (RW per attività e investimenti esteri, se rilevanti).</li>
          <li>Trasmetti entro il <strong>2 novembre 2026</strong> per l'anno d'imposta 2025 (31/10 cade di sabato).</li>
          <li>Torna qui e segna la dichiarazione come inviata.</li>
        </ol>
        <p className="text-xs text-slate-400">
          La trasmissione per conto terzi è riservata agli intermediari abilitati (art. 3 c.3 DPR 322/1998): per la
          propria dichiarazione l'invio via Fisconline è legittimo.
        </p>
        {esistente && esistente.stato !== 'inviata_manualmente' && (
          <button
            className="btn-secondary no-print"
            onClick={() => update(esistente.id, { stato: 'inviata_manualmente' })}
          >
            ✓ Segna come inviata
          </button>
        )}
      </section>
    </div>
  )
}
