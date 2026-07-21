import { createClient } from '@supabase/supabase-js'

// Layer dati: usa Supabase se configurato via .env, altrimenti localStorage.
// Le tabelle vivono nello schema 'veltra' per tenere ordine nel progetto condiviso.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = url && anonKey
  ? createClient(url, anonKey)
  : null

export const isSupabaseMode = supabase !== null

// tenant_id: in modalita Supabase = user UID (set dall'auth context),
// in modalita locale = 'local'. Si usa il valore cached per evitare
// chiamate async dentro dbInsert/dbUpdate.
let cachedTenantId = 'local'
export function setTenantId(id: string) {
  cachedTenantId = id
}
export function getActiveTenantId(): string {
  return cachedTenantId
}

// In modalita Supabase le tabelle hanno il prefisso 'veltra_' per isolarsi
// nel progetto condiviso (schema public, ma nome distinto).
function sbTable(table: string): string {
  return supabase ? `veltra_${table}` : table
}

function lsKey(table: string) {
  return `nf_db_${table}`
}

function lsRead<T>(table: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(lsKey(table)) || '[]') as T[]
  } catch {
    return []
  }
}

function lsWrite<T>(table: string, rows: T[]) {
  localStorage.setItem(lsKey(table), JSON.stringify(rows))
}

export async function dbList<T extends { id: string }>(table: string): Promise<T[]> {
  if (supabase) {
    const { data, error } = await supabase.from(sbTable(table)).select('*').eq('tenant_id', getActiveTenantId()).order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as T[]
  }
  return lsRead<T>(table)
}

export async function dbInsert<T extends { id?: string }>(table: string, row: Partial<T>): Promise<T> {
  const record = {
    ...row,
    id: row.id || crypto.randomUUID(),
    tenant_id: getActiveTenantId(),
    created_at: new Date().toISOString(),
  } as unknown as T & { id: string }
  if (supabase) {
    const { data, error } = await supabase.from(sbTable(table)).insert(record).select().single()
    if (error) throw error
    return data as T
  }
  const rows = lsRead<T & { id: string }>(table)
  rows.unshift(record)
  lsWrite(table, rows)
  return record
}

export async function dbUpdate<T extends { id: string }>(
  table: string,
  id: string,
  patch: Partial<T>
): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from(sbTable(table)).update(patch as Record<string, unknown>).eq('id', id)
    if (error) throw error
    return
  }
  const rows = lsRead<T>(table)
  const idx = rows.findIndex((r) => r.id === id)
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], ...patch }
    lsWrite(table, rows)
  }
}

export async function dbDelete(table: string, id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from(sbTable(table)).delete().eq('id', id)
    if (error) throw error
    return
  }
  const rows = lsRead<{ id: string }>(table)
  lsWrite(
    table,
    rows.filter((r) => r.id !== id)
  )
}
