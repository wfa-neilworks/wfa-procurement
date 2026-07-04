import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const missingEnvVars = !supabaseUrl || !supabaseAnonKey

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'wfa-procurement-auth',
      flowType: 'pkce',
    },
  }
)

export function handleSupabaseError(error: any): string {
  if (error?.message) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}
