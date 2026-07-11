import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Layer dati: usa Supabase se configurato via .env, altrimenti localStorage.
// Le tabelle e i campi coincidono, quindi il passaggio è trasparente.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseMode = supabase !== null

// In modalità Supabase, tenant_id = user UID. In locale, = 'local'.
function getTenantId(): string {
  if (supabase) {
    const user = supabase.auth.getUser()
    // sincrono wrapper: getUser è async, ma per insert/update usiamo il valore cached
    return supabase.auth.getSession().then((r) => r.data.session?.user?.id ?? 'local').catch(() => 'local') as unknown as string
  }
  return 'local'
}

// tenant_id cached dall'auth context per evitare async in dbInsert
let cachedTenantId = 'local'
export function setTenantId(id: string) {
  cachedTenantId = id
}
export function getActiveTenantId(): string {
  return cachedTenantId
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
    const { data, error } = await supabase.from(table).select('*').eq('tenant_id', getActiveTenantId()).order('created_at', { ascending: false })
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
    const { data, error } = await supabase.from(table).insert(record).select().single()
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
    const { error } = await supabase.from(table).update(patch as Record<string, unknown>).eq('id', id)
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
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    return
  }
  const rows = lsRead<{ id: string }>(table)
  lsWrite(
    table,
    rows.filter((r) => r.id !== id)
  )
}
