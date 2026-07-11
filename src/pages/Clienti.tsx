import { FormEvent, useState } from 'react'
import { useTable } from '../lib/hooks'
import { Cliente } from '../types'

export default function Clienti() {
  const { rows: clienti, insert, update, remove } = useTable<Cliente>('clienti')
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const dati: Partial<Cliente> = {
      denominazione: String(fd.get('denominazione')),
      piva: String(fd.get('piva') || ''),
      cf: String(fd.get('cf') || ''),
      codice_destinatario: String(fd.get('codice_destinatario') || ''),
      pec_destinatario: String(fd.get('pec_destinatario') || ''),
      indirizzo: String(fd.get('indirizzo') || ''),
      comune: String(fd.get('comune') || ''),
      provincia: String(fd.get('provincia') || ''),
      cap: String(fd.get('cap') || ''),
      paese: 'IT',
    }
    if (editing) {
      await update(editing.id, dati)
    } else {
      await insert(dati)
    }
    setEditing(null)
    setShowForm(false)
  }

  const f = editing

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Clienti</h1>
          <p className="text-sm text-slate-500">Anagrafica controparti per la fatturazione elettronica</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null)
            setShowForm(!showForm)
          }}
        >
          {showForm && !editing ? 'Chiudi' : '+ Nuovo cliente'}
        </button>
      </header>

      {(showForm || editing) && (
        <form key={editing?.id || 'new'} onSubmit={onSubmit} className="card grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="label">Denominazione *</label>
            <input className="input" name="denominazione" defaultValue={f?.denominazione} required />
          </div>
          <div>
            <label className="label">Codice destinatario SDI (7 caratteri)</label>
            <input className="input num" name="codice_destinatario" defaultValue={f?.codice_destinatario} maxLength={7} placeholder="0000000 se assente" />
          </div>
          <div>
            <label className="label">Partita IVA</label>
            <input className="input num" name="piva" defaultValue={f?.piva} maxLength={11} />
          </div>
          <div>
            <label className="label">Codice fiscale</label>
            <input className="input num" name="cf" defaultValue={f?.cf} maxLength={16} />
          </div>
          <div>
            <label className="label">PEC destinatario</label>
            <input className="input" type="email" name="pec_destinatario" defaultValue={f?.pec_destinatario} />
          </div>
          <div>
            <label className="label">Indirizzo</label>
            <input className="input" name="indirizzo" defaultValue={f?.indirizzo} />
          </div>
          <div>
            <label className="label">Comune</label>
            <input className="input" name="comune" defaultValue={f?.comune} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Provincia</label>
              <input className="input" name="provincia" defaultValue={f?.provincia} maxLength={2} />
            </div>
            <div>
              <label className="label">CAP</label>
              <input className="input num" name="cap" defaultValue={f?.cap} maxLength={5} />
            </div>
          </div>
          <div className="md:col-span-3 flex justify-end gap-2">
            {editing && (
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                Annulla
              </button>
            )}
            <button className="btn-primary" type="submit">
              {editing ? 'Aggiorna' : 'Salva cliente'}
            </button>
          </div>
        </form>
      )}

      <section className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Denominazione</th>
              <th className="th">P.IVA / CF</th>
              <th className="th">SDI / PEC</th>
              <th className="th">Sede</th>
              <th className="th">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clienti.map((c) => (
              <tr key={c.id}>
                <td className="td font-semibold">{c.denominazione}</td>
                <td className="td num">{c.piva || c.cf || '—'}</td>
                <td className="td">{c.codice_destinatario || c.pec_destinatario || '—'}</td>
                <td className="td">{[c.comune, c.provincia].filter(Boolean).join(' ') || '—'}</td>
                <td className="td space-x-2 whitespace-nowrap">
                  <button
                    className="btn-secondary !px-2 !py-1 text-xs"
                    onClick={() => {
                      setEditing(c)
                      setShowForm(true)
                    }}
                  >
                    Modifica
                  </button>
                  <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => remove(c.id)}>
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
            {clienti.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={5}>
                  Nessun cliente. Creane uno o importa da Fatture in Cloud (Impostazioni).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
