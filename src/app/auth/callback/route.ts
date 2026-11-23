import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { homePathForRole } from '@/lib/auth/roles'
import { getProfile } from '@/lib/auth/getProfile'
import { getSupabaseConfig } from '@/lib/supabase/config'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Gunakan header proxy Vercel untuk mendeteksi origin aktual pengguna
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin

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
    const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseConfig()

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(`${origin}/login?error=unknown`)
    }

    // Response default sementara
    let response = NextResponse.redirect(`${origin}/login?error=unknown`)

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get('cookie') || ''
          return cookieHeader
            .split(';')
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => {
              const [name, ...val] = c.split('=')
              return { name, value: val.join('=') }
            })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

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
      // Jika profile tidak ditemukan atau belum didaftarkan admin
      await supabase.auth.signOut()
      const notRegisteredResp = NextResponse.redirect(`${origin}/login?error=not_registered`)
      response.cookies.getAll().forEach((c) => {
        notRegisteredResp.cookies.delete(c.name)
      })
      return notRegisteredResp
    }

    const destination = homePathForRole(profile.role)
    const successResponse = NextResponse.redirect(`${origin}${destination}`)

    // Salin seluruh cookie sesi login ke response akhir
    response.cookies.getAll().forEach((c) => {
      successResponse.cookies.set(c.name, c.value, c)
    })

    return successResponse
  }

  return NextResponse.redirect(`${origin}/login?error=unknown`)
}
