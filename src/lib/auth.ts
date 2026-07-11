import { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseMode } from './db'

export function requireAuth(): boolean {
  return isSupabaseMode
}

export async function signInWithGoogle() {
  if (!supabase) return
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) return
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(cb: (user: User | null) => void) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}

export async function currentUser(): Promise<User | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}
