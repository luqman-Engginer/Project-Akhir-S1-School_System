import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from './config'

export function createClient() {
  const { url, anonKey } = getSupabaseConfig()

  if (!url || !anonKey) {
    throw new Error('Supabase URL atau Anon Key belum dikonfigurasi di environment variable.')
  }

  return createBrowserClient(url, anonKey)
}
