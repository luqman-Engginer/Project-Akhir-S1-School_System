import { createClient } from '@/lib/supabase/server'
import type { Role } from './roles'

export interface UserProfile {
  id: string
  auth_user_id: string
  email: string
  email_normalized: string
  full_name: string
  role: Role
  phone: string | null
  is_homeroom: boolean
  is_active: boolean
  is_demo: boolean
  created_at: string
  updated_at: string
}

/**
 * Mengambil profil terotentikasi pengguna aktif langsung dari tabel `profiles` di database.
 * PENTING: Role selalu dibaca dari database, bukan dari token atau metadata client.
 * Mengembalikan null jika:
 * - Tidak ada sesi login aktif
 * - Profil tidak ditemukan di database
 * - Status is_active = false
 */
export async function getProfile(
  client?: Awaited<ReturnType<typeof createClient>>
): Promise<UserProfile | null> {
  const supabase = client ?? (await createClient())

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return null
  }

  // Tolak jika akun dalam keadaan dinonaktifkan
  if (!profile.is_active) {
    return null
  }

  return profile as UserProfile
}
