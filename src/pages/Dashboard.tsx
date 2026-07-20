import { Link } from 'react-router-dom'
import { useProfilo, useTable } from '../lib/hooks'
import { Fattura, Scadenza } from '../types'
import { calcolaPrevisione, fmtEuro, fmtPct } from '../engine/fiscale'

export default function Dashboard() {
  const { profilo, loading: profLoading } = useProfilo()
  const { rows: fatture, loading: fattLoading } = useTable<Fattura>('fatture')
  const { rows: scadenze, error: scadErr } = useTable<Scadenza>('scadenze')

  const anno = new Date().getFullYear()
  const prev = profilo ? calcolaPrevisione(fatture, profilo, anno) : null
  if (profLoading || fattLoading) return <div className="text-slate-400 animate-pulse pt-20 text-center">Caricamento…</div>

  const prossimeScadenze = scadenze
    .filter((s) => s.stato !== 'completata' && new Date(s.data) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 5)

  const ultimeFatture = [...fatture]
    .filter((f) => f.tipo === 'attiva')
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5)

  const passive = fatture.filter((f) => f.tipo === 'passiva').length
  const fattureAnno = fatture.filter((f) => f.tipo === 'attiva' && new Date(f.data).getFullYear() === anno).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-slate-500">
          {profilo?.denominazione} · P.IVA {profilo?.piva} · anno {anno}
        </p>
      </header>

      {scadErr && (
        <div className="card border-rose-200 bg-rose-50 text-rose-600 text-sm">Errore scadenze: {scadErr}</div>
      )}
      {prev?.alertEsclusione && (
        <div className="card border-rose-300 bg-rose-50 text-rose-700 text-sm font-semibold">
          ⚠ Ricavi oltre 100.000 €: esclusione immediata dal regime forfettario (art. 1 c.57 L.190/2014). Contatta un commercialista.
        </div>
      )}
      {!prev?.alertEsclusione && prev?.alertSoglia && (
        <div className="card border-amber-300 bg-amber-50 text-amber-700 text-sm font-semibold">
          ⚠ Superata la soglia di 85.000 €: dal prossimo anno esci dal regime forfettario.
        </div>
      )}
      {!prev?.alertSoglia && prev?.alertPreavviso && (
        <div className="card border-amber-200 bg-amber-50 text-amber-700 text-sm">
          Attenzione: hai superato 75.000 € di ricavi. Mancano {fmtEuro(prev.residuoSoglia)} alla soglia del forfettario.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label={`Ricavi ${anno}`} value={fmtEuro(prev?.ricaviTotali ?? 0)} sub={`${fattureAnno} fatture`} />
        <Stat label="Imposta sostitutiva" value={fmtEuro(prev?.impostaSostitutiva ?? 0)} />
        <Stat label="Contributi INPS" value={fmtEuro(prev?.contributiInpsStimati ?? 0)} />
        <Stat
          label="Totale tasse"
          value={fmtEuro(prev?.totaleDovutoStimato ?? 0)}
          sub={prev && prev.ricaviTotali > 0 ? `${fmtPct(prev.aliquotaEffettiva)} dei ricavi` : undefined}
          highlight
        />
      </div>

      <div className="card">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-bold">Soglia forfettario (85.000 €)</h2>
          <span className="text-sm text-slate-500 num">{fmtEuro(prev?.ricaviTotali ?? 0)} / 85.000,00 €</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              prev?.alertSoglia ? 'bg-rose-500' : prev?.alertPreavviso ? 'bg-amber-400' : 'bg-neurora-gradient'
            }`}
            style={{ width: `${(prev?.percentualeSoglia ?? 0) * 100}%` }}
          />
        </div>
      </div>

      {/* Grafico ricavi mensili */}
      <div className="card">
        <h2 className="font-bold mb-3">Ricavi per mese ({anno})</h2>
        <GraficoMesi fatture={fatture.filter((f) => f.tipo === 'attiva' && new Date(f.data).getFullYear() === anno)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Prossime scadenze</h2>
            <Link to="/f24" className="text-sm text-accent font-semibold">F24 →</Link>
          </div>
          {prossimeScadenze.length === 0 ? (
            <p className="text-sm text-slate-400">Nessuna scadenza imminente. Genera un F24 per crearle.</p>
          ) : (
            <ul className="space-y-2">
              {prossimeScadenze.map((s) => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span>{s.descrizione}</span>
                  <span className="num text-slate-500">
                    {new Date(s.data).toLocaleDateString('it-IT')}
                    {s.importo_stimato ? ` · ${fmtEuro(s.importo_stimato)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Ultime fatture</h2>
            <Link to="/fatture" className="text-sm text-accent font-semibold">Tutte →</Link>
          </div>
          {ultimeFatture.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nessuna fattura. <Link to="/fatture" className="text-accent">Crea la prima</Link> o importa da
              Fatture in Cloud (Impostazioni).
            </p>
          ) : (
            <ul className="space-y-2">
              {ultimeFatture.map((f) => (
                <li key={f.id} className="flex justify-between text-sm">
                  <span>
                    <span className="font-semibold">{f.numero}</span> · {f.cliente_denominazione}
                  </span>
                  <span className="num">{fmtEuro(f.importo)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function GraficoMesi({ fatture }: { fatture: Fattura[] }) {
  const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
  const perMese = Array.from({ length: 12 }, () => 0)
  for (const f of fatture) {
    const m = new Date(f.data).getMonth()
    perMese[m] += f.importo
  }
  const max = Math.max(...perMese, 1)
  return (
    <div className="flex items-end gap-1 h-32">
      {perMese.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-neurora-gradient min-h-[2px]"
            style={{ height: `${(v / max) * 100}%` }}
            title={fmtEuro(v)}
          />
          <span className="text-[10px] text-slate-400">{mesi[i]}</span>
        </div>
      ))}
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`card ${highlight ? 'bg-neurora-gradient text-white border-0' : ''}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-white/80' : 'text-slate-500'}`}>
        {label}
      </div>
      <div className="text-2xl font-extrabold num mt-1">{value}</div>
      {sub && <div className={`text-xs mt-1 ${highlight ? 'text-white/80' : 'text-slate-400'}`}>{sub}</div>}
    </div>
  )
}
