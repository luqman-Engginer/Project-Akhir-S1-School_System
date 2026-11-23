import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'

/**
 * Admin client menggunakan SUPABASE_SERVICE_ROLE_KEY.
 * PENTING: Hanya boleh dipanggil di sisi server (Server Action, Route Handler, background job).
 * Service role key membypass RLS (Row Level Security).
 * Package 'server-only' memastikan file ini tidak pernah bisa di-import dari Client Component.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase admin client HANYA boleh dijalankan di server environment!')
  }

  const { url, serviceRoleKey } = getSupabaseConfig()

  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_URL belum dikonfigurasi di environment variable server.'
    )
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
