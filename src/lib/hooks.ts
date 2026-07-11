import { useCallback, useEffect, useState } from 'react'
import { dbDelete, dbInsert, dbList, dbUpdate } from './db'
import { ProfiloFiscale } from '../types'

export function useTable<T extends { id: string }>(table: string) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await dbList<T>(table))
    } finally {
      setLoading(false)
    }
  }, [table])

  useEffect(() => {
    reload()
  }, [reload])

  const insert = useCallback(
    async (row: Partial<T>) => {
      const r = await dbInsert<T>(table, row)
      await reload()
      return r
    },
    [table, reload]
  )

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      await dbUpdate<T>(table, id, patch)
      await reload()
    },
    [table, reload]
  )

  const remove = useCallback(
    async (id: string) => {
      await dbDelete(table, id)
      await reload()
    },
    [table, reload]
  )

  return { rows, loading, reload, insert, update, remove }
}

// Profilo fiscale di default (dati founder, §2.2 documento master).
// REA e ATECO secondario: da verificare su visura aggiornata (scelta founder 11/07/2026).
export const PROFILO_DEFAULT: Omit<ProfiloFiscale, 'id'> = {
  denominazione: 'Davide Pantaleo',
  piva: '01287030777',
  cf: 'PNTDVD88L28F052K',
  indirizzo: 'Via Vernazzola 11/c',
  comune: 'Cilavegna',
  provincia: 'PV',
  cap: '27024',
  pec: 'drylandstudio@pec.it',
  rea: 'MT-87391 (da verificare)',
  regime: 'forfettario',
  ateco_codici: [
    { codice: '59.20.3', descrizione: 'Studi di registrazione sonora', coeff: 0.67, prevalente: true },
    { codice: '62.01.00', descrizione: 'Produzione di software', coeff: 0.67, prevalente: false },
  ],
  aliquota_sostitutiva: 0.15,
  aliquota_inps: 0.2607,
  gestione_inps: 'separata',
  data_apertura_piva: '2015-04-01',
}

export function useProfilo() {
  const { rows, loading, insert, update, reload } = useTable<ProfiloFiscale>('profili_fiscali')
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (!loading && rows.length === 0 && !seeded) {
      setSeeded(true)
      insert(PROFILO_DEFAULT as Partial<ProfiloFiscale>)
    }
  }, [loading, rows, seeded, insert])

  return { profilo: rows[0] ?? null, loading, update, reload }
}
