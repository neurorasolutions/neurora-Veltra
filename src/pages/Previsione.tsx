import { useState } from 'react'
import { useProfilo, useTable } from '../lib/hooks'
import { Fattura } from '../types'
import { calcolaPrevisione, fmtEuro, fmtPct, aliquotaSostitutivaPerAnno } from '../engine/fiscale'
import { calcolaAcconto } from '../engine/f24'
import { calcolaBolloTrimestri } from '../engine/bollo'

export default function Previsione() {
  const { profilo } = useProfilo()
  const { rows: fatture } = useTable<Fattura>('fatture')
  const [anno, setAnno] = useState(new Date().getFullYear())

  if (!profilo) return null
  const prev = calcolaPrevisione(fatture, profilo, anno)
  const prevAnnoPrecedente = calcolaPrevisione(fatture, profilo, anno - 1)
  const acconto = calcolaAcconto(prevAnnoPrecedente.impostaSostitutiva)
  const bollo = calcolaBolloTrimestri(fatture, anno)
  const bolloTotale = bollo.reduce((s, b) => s + b.importo, 0)

  const anni = [...new Set(fatture.map((f) => new Date(f.data).getFullYear()))]
    .concat(new Date().getFullYear())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Previsione tasse</h1>
          <p className="text-sm text-slate-500">
            Calcolo deterministico in tempo reale — regime forfettario, aliquota{' '}
            {fmtPct(aliquotaSostitutivaPerAnno(profilo, anno))}
          </p>
        </div>
        <select className="input !w-32" value={anno} onChange={(e) => setAnno(Number(e.target.value))}>
          {anni.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </header>

      <section className="card">
        <h2 className="font-bold mb-4">Catena di calcolo {anno}</h2>
        <div className="space-y-3">
          <Step n={1} label="Ricavi incassati (fatture attive)" value={fmtEuro(prev.ricaviTotali)} />
          {prev.breakdown.map((b) => (
            <div key={b.codice} className="ml-8 flex justify-between text-sm text-slate-500">
              <span>
                ATECO {b.codice} — {fmtEuro(b.ricavi)} × coeff. {fmtPct(b.coeff)}
              </span>
              <span className="num">{fmtEuro(b.redditoImponibile)}</span>
            </div>
          ))}
          <Step n={2} label="Reddito imponibile (× coefficiente redditività)" value={fmtEuro(prev.redditoImponibile)} />
          <Step
            n={3}
            label={`Contributi INPS Gestione Separata (${fmtPct(prev.aliquotaInps)}) — stima maturata`}
            value={fmtEuro(prev.contributiInpsStimati)}
          />
          <Step n={4} label="Reddito netto (imponibile − contributi)" value={fmtEuro(prev.redditoNetto)} />
          <Step
            n={5}
            label={`Imposta sostitutiva (${fmtPct(prev.aliquotaSostitutiva)})`}
            value={fmtEuro(prev.impostaSostitutiva)}
          />
          <div className="border-t border-slate-200 pt-3 flex justify-between font-extrabold">
            <span>Totale stimato da accantonare</span>
            <span className="num text-accent">{fmtEuro(prev.totaleDovutoStimato)}</span>
          </div>
          {prev.ricaviTotali > 0 && (
            <p className="text-xs text-slate-400">
              Pressione fiscale effettiva: {fmtPct(prev.aliquotaEffettiva)} dei ricavi.
            </p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card">
          <h2 className="font-bold mb-3">Acconti {anno} (metodo storico)</h2>
          {acconto.nonDovuto ? (
            <p className="text-sm text-slate-500">
              Acconto non dovuto: imposta {anno - 1} sotto 51,65 €.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>1ª rata (50%) — scadenza 30/06/{anno}</span>
                <span className="num">{fmtEuro(acconto.primaRata)}</span>
              </li>
              <li className="flex justify-between">
                <span>
                  2ª rata ({acconto.unicaSoluzione ? 'unica soluzione' : '50%'}) — scadenza 30/11/{anno}
                </span>
                <span className="num">{fmtEuro(acconto.unicaSoluzione ? acconto.totale : acconto.secondaRata)}</span>
              </li>
            </ul>
          )}
          <p className="text-xs text-slate-400 mt-3">
            Base: 100% dell'imposta {anno - 1} ({fmtEuro(prevAnnoPrecedente.impostaSostitutiva)}). Split 50/50 —
            soggetti ISA, art. 58 DL 124/2019 (D-011). Primo anno di regime: acconto non dovuto.
          </p>
        </section>

        <section className="card">
          <h2 className="font-bold mb-3">Bollo virtuale {anno}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Trim.</th>
                <th className="th">Fatture</th>
                <th className="th">Codice</th>
                <th className="th">Scadenza</th>
                <th className="th">Importo</th>
              </tr>
            </thead>
            <tbody>
              {bollo.map((b) => (
                <tr key={b.trimestre}>
                  <td className="td">{b.trimestre}°</td>
                  <td className="td num">{b.numeroFatture}</td>
                  <td className="td num">{b.codiceTributo}</td>
                  <td className="td num">{new Date(b.scadenza).toLocaleDateString('it-IT')}</td>
                  <td className="td num">{fmtEuro(b.importo)}</td>
                </tr>
              ))}
              <tr>
                <td className="td font-bold" colSpan={4}>Totale</td>
                <td className="td num font-bold">{fmtEuro(bolloTotale)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <section className="card text-xs text-slate-400 space-y-1">
        <p>
          <strong>Nota 1</strong> — I contributi INPS mostrati qui sono la stima <em>maturata</em> (previsionale). In
          dichiarazione dei redditi si deducono i contributi <em>versati</em> nell'anno (principio di cassa, D-012).
        </p>
        <p>
          <strong>Nota 2</strong> — Parametri normativi verificati l'11/07/2026 con fonti tracciate (L. 190/2014, INPS
          2026, istruzioni F24 AdE). Nessun valore è a memoria.
        </p>
      </section>
    </div>
  )
}

function Step({ n, label, value }: { n: number; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-xs font-bold mr-3">
          {n}
        </span>
        {label}
      </span>
      <span className="num font-semibold">{value}</span>
    </div>
  )
}
