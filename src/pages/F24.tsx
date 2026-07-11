import { useMemo, useState } from 'react'
import { useProfilo, useTable } from '../lib/hooks'
import { F24Doc, Fattura, Scadenza, TipoF24 } from '../types'
import { calcolaPrevisione, fmtEuro, round2 } from '../engine/fiscale'
import {
  generaF24Giugno,
  generaF24Novembre,
  scadenzaPerTipo,
  calcolaRavvedimento,
} from '../engine/f24'
import { calcolaBolloTrimestri, righeF24Bollo } from '../engine/bollo'

export default function F24Page() {
  const { profilo } = useProfilo()
  const { rows: fatture } = useTable<Fattura>('fatture')
  const { rows: f24docs, insert, update, remove } = useTable<F24Doc>('f24_generati')
  const { insert: insertScadenza } = useTable<Scadenza>('scadenze')

  const annoCorrente = new Date().getFullYear()
  const [annoRif, setAnnoRif] = useState(annoCorrente - 1) // anno d'imposta (saldo)
  const [tipo, setTipo] = useState<TipoF24>('saldo_acconto1')
  const [accontiVersati, setAccontiVersati] = useState(0)
  const [inpsAccontiVersati, setInpsAccontiVersati] = useState(0)
  const [stampa, setStampa] = useState<F24Doc | null>(null)
  // Ravvedimento
  const [ravImporto, setRavImporto] = useState(0)
  const [ravGiorni, setRavGiorni] = useState(30)

  const prevRif = useMemo(
    () => (profilo ? calcolaPrevisione(fatture, profilo, annoRif) : null),
    [fatture, profilo, annoRif]
  )

  const anteprima = useMemo(() => {
    if (!prevRif || !profilo) return null
    const primoAnno = new Date(profilo.data_apertura_piva).getFullYear() === annoRif + 1
    const input = {
      anno: annoRif,
      impostaAnnoRiferimento: round2(prevRif.impostaSostitutiva),
      accontiVersatiAnnoRiferimento: accontiVersati,
      inpsAnnoRiferimento: round2(prevRif.contributiInpsStimati),
      inpsAccontiVersati,
      primoAnnoAttivita: primoAnno,
    }
    if (tipo === 'saldo_acconto1') return generaF24Giugno(input)
    if (tipo === 'acconto2') return generaF24Novembre(input)
    // bollo: F24 con i trimestri dell'anno di riferimento
    const righe = righeF24Bollo(calcolaBolloTrimestri(fatture, annoRif), annoRif)
    return { righe, totale: round2(righe.reduce((s, r) => s + r.importo, 0)), note: [] as string[] }
  }, [prevRif, profilo, annoRif, tipo, accontiVersati, inpsAccontiVersati, fatture])

  async function salvaF24() {
    if (!anteprima || anteprima.righe.length === 0) return
    const annoVersamento = tipo === 'bollo' ? annoRif : annoRif + 1
    const dataScadenza = scadenzaPerTipo(tipo, annoVersamento)
    const doc = await insert({
      anno_riferimento: annoRif,
      tipo,
      data_scadenza: dataScadenza,
      righe: anteprima.righe,
      totale: anteprima.totale,
      stato: 'pronto',
    })
    await insertScadenza({
      tipo: `f24_${tipo}`,
      data: dataScadenza,
      descrizione: `F24 ${etichettaTipo(tipo)} — anno ${annoRif}`,
      importo_stimato: anteprima.totale,
      stato: 'pendente',
    })
    setStampa(doc)
  }

  const rav = ravImporto > 0 ? calcolaRavvedimento(ravImporto, ravGiorni) : null

  if (stampa) return <VistaStampa doc={stampa} onBack={() => setStampa(null)} cf={profilo?.cf || ''} />

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Generazione F24</h1>
        <p className="text-sm text-slate-500">
          Il modello viene generato con istruzioni di pagamento — paghi via home banking o F24 web (D-003).
        </p>
      </header>

      <section className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Tipo F24</label>
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoF24)}>
              <option value="saldo_acconto1">Giugno — saldo + 1° acconto</option>
              <option value="acconto2">Novembre — 2° acconto</option>
              <option value="bollo">Bollo virtuale (trimestri)</option>
            </select>
          </div>
          <div>
            <label className="label">Anno d'imposta</label>
            <select className="input" value={annoRif} onChange={(e) => setAnnoRif(Number(e.target.value))}>
              {[annoCorrente, annoCorrente - 1, annoCorrente - 2].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          {tipo !== 'bollo' && (
            <>
              <div>
                <label className="label">Acconti imposta già versati per {annoRif} (€)</label>
                <input
                  className="input num"
                  type="number"
                  step="0.01"
                  min="0"
                  value={accontiVersati}
                  onChange={(e) => setAccontiVersati(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Acconti INPS già versati per {annoRif} (€)</label>
                <input
                  className="input num"
                  type="number"
                  step="0.01"
                  min="0"
                  value={inpsAccontiVersati}
                  onChange={(e) => setInpsAccontiVersati(Number(e.target.value))}
                />
              </div>
            </>
          )}
        </div>

        {prevRif && tipo !== 'bollo' && (
          <p className="text-xs text-slate-400">
            Base di calcolo {annoRif}: imposta {fmtEuro(prevRif.impostaSostitutiva)} · INPS{' '}
            {fmtEuro(prevRif.contributiInpsStimati)} (da {fmtEuro(prevRif.ricaviTotali)} di ricavi fatturati).
          </p>
        )}

        {anteprima && (
          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-bold mb-2 text-sm">Anteprima righe F24</h3>
            {anteprima.righe.length === 0 ? (
              <p className="text-sm text-slate-400">Nessun importo da versare per questa combinazione.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="th">Sezione</th>
                    <th className="th">Codice / Causale</th>
                    <th className="th">Anno</th>
                    <th className="th">Descrizione</th>
                    <th className="th">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {anteprima.righe.map((r, i) => (
                    <tr key={i}>
                      <td className="td capitalize">{r.sezione}</td>
                      <td className="td num font-semibold">{r.codice}</td>
                      <td className="td num">{r.anno}</td>
                      <td className="td">{r.descrizione}</td>
                      <td className="td num">{fmtEuro(r.importo)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="td font-bold" colSpan={4}>Totale</td>
                    <td className="td num font-bold text-accent">{fmtEuro(anteprima.totale)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            {anteprima.note.map((n, i) => (
              <p key={i} className="text-xs text-amber-600 mt-2">ℹ {n}</p>
            ))}
            <div className="mt-4 flex justify-end">
              <button className="btn-primary" onClick={salvaF24} disabled={anteprima.righe.length === 0}>
                Genera F24 + scadenza
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="font-bold mb-3">F24 generati</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Tipo</th>
              <th className="th">Anno imposta</th>
              <th className="th">Scadenza</th>
              <th className="th">Totale</th>
              <th className="th">Stato</th>
              <th className="th">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {f24docs.map((d) => (
              <tr key={d.id}>
                <td className="td">{etichettaTipo(d.tipo)}</td>
                <td className="td num">{d.anno_riferimento}</td>
                <td className="td num">{new Date(d.data_scadenza).toLocaleDateString('it-IT')}</td>
                <td className="td num">{fmtEuro(d.totale)}</td>
                <td className="td">
                  <span
                    className={`badge ${
                      d.stato === 'pagato' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {d.stato}
                  </span>
                </td>
                <td className="td space-x-2 whitespace-nowrap">
                  <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => setStampa(d)}>
                    Visualizza / Stampa
                  </button>
                  {d.stato !== 'pagato' && (
                    <button
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => update(d.id, { stato: 'pagato' })}
                    >
                      ✓ Pagato
                    </button>
                  )}
                  <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => remove(d.id)}>
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
            {f24docs.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={6}>Nessun F24 generato.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="font-bold mb-3">Calcolatore ravvedimento operoso</h2>
        <p className="text-xs text-slate-400 mb-3">
          Base sanzione 25% (D.Lgs. 87/2024, dal 1/9/2024) · interessi al tasso legale 2026 (1,60%).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Importo non versato (€)</label>
            <input className="input num" type="number" step="0.01" min="0" value={ravImporto} onChange={(e) => setRavImporto(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Giorni di ritardo</label>
            <input className="input num" type="number" min="1" value={ravGiorni} onChange={(e) => setRavGiorni(Number(e.target.value))} />
          </div>
          {rav && (
            <div className="text-sm space-y-1 self-end">
              <p className="text-xs text-slate-500">{rav.descrizione}</p>
              <p>
                Sanzione <span className="num">{fmtEuro(rav.sanzione)}</span> + interessi{' '}
                <span className="num">{fmtEuro(rav.interessi)}</span> ={' '}
                <span className="num font-bold text-accent">{fmtEuro(rav.totale)}</span>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function etichettaTipo(t: TipoF24): string {
  return t === 'saldo_acconto1' ? 'Saldo + 1° acconto' : t === 'acconto2' ? '2° acconto' : 'Bollo virtuale'
}

function VistaStampa({ doc, onBack, cf }: { doc: F24Doc; onBack: () => void; cf: string }) {
  const erario = doc.righe.filter((r) => r.sezione === 'erario')
  const inps = doc.righe.filter((r) => r.sezione === 'inps')
  return (
    <div className="space-y-4">
      <div className="no-print flex justify-between">
        <button className="btn-secondary" onClick={onBack}>← Indietro</button>
        <button className="btn-primary" onClick={() => window.print()}>🖨 Stampa / PDF</button>
      </div>
      <div className="card max-w-3xl">
        <h1 className="text-xl font-extrabold mb-1">Modello F24 — {etichettaTipo(doc.tipo)}</h1>
        <p className="text-sm text-slate-500 mb-4">
          Anno d'imposta {doc.anno_riferimento} · Scadenza {new Date(doc.data_scadenza).toLocaleDateString('it-IT')} ·
          Codice fiscale contribuente: <span className="num">{cf}</span>
        </p>

        {erario.length > 0 && (
          <>
            <h2 className="font-bold text-sm uppercase tracking-wide mt-4 mb-2">Sezione Erario</h2>
            <TabellaRighe righe={erario} intestazione="Codice tributo" />
          </>
        )}
        {inps.length > 0 && (
          <>
            <h2 className="font-bold text-sm uppercase tracking-wide mt-4 mb-2">Sezione INPS</h2>
            <TabellaRighe righe={inps} intestazione="Causale contributo" />
          </>
        )}

        <div className="border-t-2 border-slate-800 mt-4 pt-3 flex justify-between font-extrabold">
          <span>SALDO FINALE</span>
          <span className="num">{fmtEuro(doc.totale)}</span>
        </div>

        <div className="mt-6 text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">Istruzioni di pagamento:</p>
          <p>1. Accedi al tuo home banking (sezione F24) oppure a "F24 web" nell'area riservata dell'Agenzia delle Entrate.</p>
          <p>2. Compila le sezioni con i codici e gli importi riportati sopra (anno di riferimento incluso).</p>
          <p>3. Effettua il pagamento entro il {new Date(doc.data_scadenza).toLocaleDateString('it-IT')}.</p>
          <p>4. Torna nell'app e segna l'F24 come "Pagato" per aggiornare lo storico versamenti.</p>
        </div>
      </div>
    </div>
  )
}

function TabellaRighe({ righe, intestazione }: { righe: F24Doc['righe']; intestazione: string }) {
  return (
    <table className="w-full text-sm border border-slate-300">
      <thead className="bg-slate-100">
        <tr>
          <th className="th">{intestazione}</th>
          <th className="th">Anno rif.</th>
          <th className="th">Descrizione</th>
          <th className="th text-right">Importo a debito</th>
        </tr>
      </thead>
      <tbody>
        {righe.map((r, i) => (
          <tr key={i}>
            <td className="td num font-bold">{r.codice}</td>
            <td className="td num">{r.anno}</td>
            <td className="td">{r.descrizione}</td>
            <td className="td num text-right">{fmtEuro(r.importo)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
