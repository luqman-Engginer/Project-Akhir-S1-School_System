import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { homePathForRole } from '@/lib/auth/roles'
import { getProfile } from '@/lib/auth/getProfile'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  // Cek parameter error dari redirect penyedia OAuth atau Supabase
  const oauthError = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description') || ''

  if (oauthError) {
    if (
      errorDescription.includes('EMAIL_NOT_REGISTERED') ||
      errorDescription.includes('Database error saving new user') ||
      errorDescription.includes('unexpected_failure')
    ) {
      return NextResponse.redirect(`${origin}/login?error=not_registered`)
    }
    return NextResponse.redirect(`${origin}/login?error=unknown`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const msg = error.message || ''
      if (
        msg.includes('EMAIL_NOT_REGISTERED') ||
        msg.includes('Database error') ||
        msg.includes('unexpected_failure')
      ) {
        return NextResponse.redirect(`${origin}/login?error=not_registered`)
      }
      return NextResponse.redirect(`${origin}/login?error=unknown`)
    }

    // Ambil profil langsung dari database tabel profiles
    const profile = await getProfile(supabase)

    if (!profile) {
      // Jika profile tidak ditemukan atau tidak aktif
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=not_registered`)
    }

    const destination = homePathForRole(profile.role)
    return NextResponse.redirect(`${origin}${destination}`)
  }

  return NextResponse.redirect(`${origin}/login?error=unknown`)
}
