import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { homePathForRole } from '@/lib/auth/roles'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Rute publik yang tidak memerlukan login
  const isStyleguideAllowed =
    pathname === '/styleguide' && process.env.NODE_ENV !== 'production'

  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/demo' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/demo-login') ||
    pathname.startsWith('/api/cron/') ||
    isStyleguideAllowed

  // 1. Jika belum login dan mengakses rute terlindungi -> redirect ke /login
  if (!user) {
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // 2. Jika sudah login -> ambil profil dari database (role & is_active)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // Jika profil tidak ditemukan atau status dinonaktifkan
  if (error || !profile || !profile.is_active) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=inactive', request.url))
  }

  const userHome = homePathForRole(profile.role)

  // Jika pengguna yang sudah login membuka /login atau root /, arahkan ke beranda rolenya
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.redirect(new URL(userHome, request.url))
  }

  // 3. Batasi akses rute berdasarkan role
  const roleProtectedPrefixes = [
    { prefix: '/admin', allowedRole: 'admin' },
    { prefix: '/guru', allowedRole: 'teacher' },
    { prefix: '/murid', allowedRole: 'student' },
    { prefix: '/ortu', allowedRole: 'parent' },
  ]

  for (const { prefix, allowedRole } of roleProtectedPrefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (profile.role !== allowedRole) {
        // Redirect ke beranda rolenya sendiri jika mencoba mengakses area role lain
        return NextResponse.redirect(new URL(userHome, request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Berlaku untuk semua path kecuali file statis dan aset
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
