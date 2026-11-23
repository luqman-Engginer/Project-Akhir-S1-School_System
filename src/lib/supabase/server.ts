import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from './config'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseConfig()

  if (!url || !anonKey) {
    throw new Error('Supabase URL atau Anon Key belum dikonfigurasi di environment variable.')
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // The `setAll` method was called from a Server Component.
          // Ini wajar jika dipanggil dari Server Component read-only
          // saat ada middleware yang bertugas me-refresh session.
        }
      },
    },
  })
}
