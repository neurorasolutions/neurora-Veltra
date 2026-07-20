import { FormEvent, useMemo, useState } from 'react'
import { useProfilo, useTable } from '../lib/hooks'
import { Cliente, Fattura, StatoSDI } from '../types'
import { fmtEuro } from '../engine/fiscale'
import { bolloDovuto } from '../engine/bollo'
import { generaXmlFatturaPA, nomeFileXml, scaricaXml } from '../services/fatturapa'
import { arubaProvider } from '../services/sdi'
import { loadSettings, isArubaConfigured } from '../lib/settings'

const STATO_BADGE: Record<StatoSDI, string> = {
  bozza: 'bg-slate-100 text-slate-600',
  inviata: 'bg-blue-100 text-blue-700',
  consegnata: 'bg-emerald-100 text-emerald-700',
  scartata: 'bg-rose-100 text-rose-700',
  ricevuta: 'bg-violet-100 text-violet-700',
}

export default function Fatture() {
  const { profilo } = useProfilo()
  const { rows: fatture, insert, update, remove } = useTable<Fattura>('fatture')
  const { rows: clienti } = useTable<Cliente>('clienti')
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassiva, setShowPassiva] = useState(false)

  const anno = new Date().getFullYear()
  const arubaOk = isArubaConfigured(loadSettings())

  const numeroProposto = useMemo(() => {
    const dellAnno = fatture.filter(
      (f) => f.tipo === 'attiva' && new Date(f.data).getFullYear() === anno
    )
    return `${dellAnno.length + 1}/${anno}`
  }, [fatture, anno])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!profilo) return
    const fd = new FormData(e.currentTarget)
    const importo = Number(fd.get('importo'))
    const clienteId = String(fd.get('cliente_id'))
    const cliente = clienti.find((c) => c.id === clienteId)
    // Idempotenza: check numero + anno prima di inserire (edge case §9)
    const numero = String(fd.get('numero'))
    const dataDoc = String(fd.get('data'))
    const duplicata = fatture.some(
      (f) => f.numero === numero && new Date(f.data).getFullYear() === new Date(dataDoc).getFullYear()
    )
    if (duplicata) {
      setMsg(`Esiste già una fattura ${numero} nello stesso anno.`)
      return
    }
    await insert({
      numero,
      data: dataDoc,
      tipo: 'attiva',
      cliente_id: clienteId,
      cliente_denominazione: cliente?.denominazione || String(fd.get('cliente_libero') || ''),
      importo,
      descrizione: String(fd.get('descrizione')),
      ateco_codice: String(fd.get('ateco_codice')),
      bollo: bolloDovuto(importo),
      stato_sdi: 'bozza',
    })
    setShowForm(false)
    setMsg('')
  }

  function generaXml(f: Fattura): string | null {
    if (!profilo) return null
    const cliente = clienti.find((c) => c.id === f.cliente_id)
    if (!cliente) {
      setMsg('Cliente non trovato: la fattura deve avere un cliente in anagrafica per generare l’XML.')
      return null
    }
    const progressivo = f.id.replace(/-/g, '').slice(0, 5).toUpperCase()
    return generaXmlFatturaPA(f, cliente, profilo, progressivo)
  }

  function onScaricaXml(f: Fattura) {
    const xml = generaXml(f)
    if (!xml || !profilo) return
    const progressivo = f.id.replace(/-/g, '').slice(0, 5).toUpperCase()
    scaricaXml(xml, nomeFileXml(profilo, progressivo))
  }

  async function onInviaSdi(f: Fattura) {
    const xml = generaXml(f)
    if (!xml || !profilo) return
    setBusy(true)
    setMsg('Invio in corso via Aruba...')
    const progressivo = f.id.replace(/-/g, '').slice(0, 5).toUpperCase()
    const esito = await arubaProvider.inviaFattura(xml, nomeFileXml(profilo, progressivo))
    setBusy(false)
    if (esito.ok) {
      await update(f.id, { stato_sdi: 'inviata', sdi_identificativo: esito.sdiId, xml })
      setMsg(`Fattura ${f.numero} inviata (ID: ${esito.sdiId}).`)
    } else {
      setMsg(`Invio fallito: ${esito.errore}`)
    }
  }

  const attive = fatture.filter((f) => f.tipo === 'attiva').sort((a, b) => b.data.localeCompare(a.data))
  const passive = fatture.filter((f) => f.tipo === 'passiva').sort((a, b) => b.data.localeCompare(a.data))

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Fatture</h1>
          <p className="text-sm text-slate-500">Fatturazione elettronica — regime forfettario (natura N2.2, no IVA)</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Chiudi' : '+ Nuova fattura'}
        </button>
      </header>

      {msg && <div className="card text-sm border-blue-200 bg-blue-50 text-blue-800">{msg}</div>}

      {showForm && (
        <form onSubmit={onSubmit} className="card grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Numero</label>
            <input className="input" name="numero" defaultValue={numeroProposto} required />
          </div>
          <div>
            <label className="label">Data</label>
            <input className="input" type="date" name="data" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </div>
          <div>
            <label className="label">Importo (€, senza IVA)</label>
            <input className="input num" type="number" step="0.01" min="0" name="importo" required />
          </div>
          <div>
            <label className="label">Cliente</label>
            <select className="input" name="cliente_id" required>
              <option value="">— seleziona —</option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>{c.denominazione}</option>
              ))}
            </select>
            {clienti.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Nessun cliente: creane uno nella pagina Clienti.</p>
            )}
          </div>
          <div>
            <label className="label">Codice ATECO</label>
            <select className="input" name="ateco_codice" required>
              {profilo?.ateco_codici.map((a) => (
                <option key={a.codice} value={a.codice}>
                  {a.codice} — {a.descrizione}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Descrizione</label>
            <input className="input" name="descrizione" placeholder="Prestazione di servizi..." required />
          </div>
          <div className="md:col-span-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Bollo 2 € applicato automaticamente se importo &gt; 77,47 €.
            </p>
            <button className="btn-primary" type="submit">Salva fattura</button>
          </div>
        </form>
      )}

      <section className="card overflow-x-auto">
        <h2 className="font-bold mb-3">Fatture attive ({attive.length})</h2>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Numero</th>
              <th className="th">Data</th>
              <th className="th">Cliente</th>
              <th className="th">Importo</th>
              <th className="th">Bollo</th>
              <th className="th">Stato SDI</th>
              <th className="th">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {attive.map((f) => (
              <tr key={f.id}>
                <td className="td font-semibold">{f.numero}</td>
                <td className="td num">{new Date(f.data).toLocaleDateString('it-IT')}</td>
                <td className="td">{f.cliente_denominazione}</td>
                <td className="td num">{fmtEuro(f.importo)}</td>
                <td className="td">{f.bollo ? '2 €' : '—'}</td>
                <td className="td">
                  <span className={`badge ${STATO_BADGE[f.stato_sdi]}`}>{f.stato_sdi}</span>
                </td>
                <td className="td space-x-2 whitespace-nowrap">
                  <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => onScaricaXml(f)}>
                    XML
                  </button>
                  {f.stato_sdi === 'bozza' && (
                    <button
                      className="btn-primary !px-2 !py-1 text-xs"
                      disabled={busy || !arubaOk}
                      title={arubaOk ? 'Invia a SDI via Aruba' : 'Configura le credenziali Aruba in Impostazioni'}
                      onClick={() => onInviaSdi(f)}
                    >
                      Invia SDI
                    </button>
                  )}
                  {f.stato_sdi === 'inviata' && (
                    <button
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => update(f.id, { stato_sdi: 'consegnata' })}
                      title="Segna come consegnata (esito SDI)"
                    >
                      ✓ Consegnata
                    </button>
                  )}
                  {f.stato_sdi === 'bozza' && (
                    <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => remove(f.id)}>
                      Elimina
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {attive.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={7}>Nessuna fattura attiva.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ————— Fatture passive ————— */}
      <section className="card overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Fatture passive ricevute ({passive.length})</h2>
          <button className="btn-secondary text-xs" onClick={() => setShowPassiva(!showPassiva)}>
            {showPassiva ? 'Chiudi' : '+ Aggiungi fattura ricevuta'}
          </button>
        </div>
        {showPassiva && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const num = String(fd.get('p_numero'))
              const dataDoc = String(fd.get('p_data'))
              const forn = String(fd.get('p_fornitore'))
              const imp = Number(fd.get('p_importo'))
              if (num && dataDoc && forn && imp) {
                insert({
                  numero: num, data: dataDoc, tipo: 'passiva',
                  cliente_id: '', cliente_denominazione: forn,
                  importo: imp, descrizione: String(fd.get('p_desc') || ''),
                  ateco_codice: '', bollo: false, stato_sdi: 'ricevuta',
                })
                setShowPassiva(false)
              }
            }}
            className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 p-4 bg-slate-50 rounded-xl"
          >
            <input className="input" name="p_numero" placeholder="N. fattura" required />
            <input className="input" type="date" name="p_data" required />
            <input className="input" name="p_fornitore" placeholder="Fornitore" required />
            <input className="input num" type="number" step="0.01" name="p_importo" placeholder="Importo" required />
            <button className="btn-primary" type="submit">Salva</button>
          </form>
        )}
        {passive.length > 0 && (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Numero</th>
                <th className="th">Data</th>
                <th className="th">Fornitore</th>
                <th className="th">Importo</th>
                <th className="th">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {passive.map((f) => (
                <tr key={f.id}>
                  <td className="td">{f.numero}</td>
                  <td className="td num">{new Date(f.data).toLocaleDateString('it-IT')}</td>
                  <td className="td">{f.cliente_denominazione}</td>
                  <td className="td num">{fmtEuro(f.importo)}</td>
                  <td className="td"><button className="btn-danger !px-2 !py-1 text-xs" onClick={() => remove(f.id)}>Elimina</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) || (
          <p className="text-sm text-slate-400">
            Nessuna fattura passiva. Aggiungile per tenere traccia delle fatture ricevute (nel forfettario non sono deducibili, ma restano in archivio).
          </p>
        )}
        <p className="text-xs text-slate-400 mt-2">
          Nel forfettario i costi non sono deducibili analiticamente: le passive sono tracciate solo per archivio.
        </p>
      </section>
    </div>
  )
}
