import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { homePathForRole, type Role } from '@/lib/auth/roles'
import { checkRateLimit } from '@/lib/rateLimit'
import { getSupabaseConfig } from '@/lib/supabase/config'

const demoLoginSchema = z.object({
  role: z.enum(['admin', 'teacher', 'student', 'parent']),
})

const DEFAULT_DEMO_ACCOUNTS: Record<
  Role,
  { email: string; full_name: string; role: Role; is_homeroom: boolean }
> = {
  admin: {
    email: 'admin.sari@demo.sekolahku.test',
    full_name: 'Bu Sari (Admin)',
    role: 'admin',
    is_homeroom: false,
  },
  teacher: {
    email: 'guru.dedi@demo.sekolahku.test',
    full_name: 'Pak Dedi (Wali Kelas)',
    role: 'teacher',
    is_homeroom: true,
  },
  student: {
    email: 'murid.raka@demo.sekolahku.test',
    full_name: 'Raka Pratama',
    role: 'student',
    is_homeroom: false,
  },
  parent: {
    email: 'ortu.hendra@demo.sekolahku.test',
    full_name: 'Pak Hendra (Ortu)',
    role: 'parent',
    is_homeroom: false,
  },
}

export async function POST(request: Request) {
  // Hanya aktif jika DEMO_MODE bernilai 'true'
  if (process.env.DEMO_MODE !== 'true') {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Rate Limiting per IP (maksimal 30 request per menit untuk evaluator)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous-demo'
  const rateLimitKey = `demo-login:${ip}`
  const { isAllowed } = checkRateLimit(rateLimitKey, 30, 60_000)

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan login demo. Silakan tunggu 1 menit.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 })
  }

  const parsed = demoLoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
  }

  const { role } = parsed.data
  const demoPassword = process.env.DEMO_PASSWORD || 'sekolahku-demo-2026'

  const { url: supabaseUrl, anonKey: supabaseAnonKey, serviceRoleKey } = getSupabaseConfig()

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          'Konfigurasi Supabase belum lengkap di Vercel: pastikan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY sudah terisi dengan benar.',
      },
      { status: 500 }
    )
  }

  let adminClient
  try {
    adminClient = createAdminClient()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Gagal inisialisasi server client: ${msg}` },
      { status: 500 }
    )
  }

  // 1. Ambil atau inisialisasi akun demo sesuai role
  const seedTarget = DEFAULT_DEMO_ACCOUNTS[role as Role]
  let targetEmail = seedTarget.email

  // Cek apakah akun demo sudah ada di tabel profiles
  const { data: existingProfile, error: profileCheckError } = await adminClient
    .from('profiles')
    .select('id, email, auth_user_id, role, is_demo, is_active')
    .eq('is_demo', true)
    .eq('role', role)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (profileCheckError) {
    if (
      profileCheckError.message.includes('relation') ||
      profileCheckError.code === '42P01'
    ) {
      return NextResponse.json(
        {
          error:
            'Tabel database belum dibuat di Supabase. Silakan jalankan file SQL di supabase/migrations pada SQL Editor Supabase terlebih dahulu.',
        },
        { status: 500 }
      )
    }
  }

  let authUserId: string | null = existingProfile?.auth_user_id || null

  // PENTING: Sesuai trigger PostgreSQL `trg_auth_users_before_insert`,
  // baris di `profiles` WAJIB ada terlebih dahulu sebelum insert ke `auth.users`!
  if (!existingProfile) {
    const { data: upsertedProfile, error: upsertError } = await adminClient
      .from('profiles')
      .upsert(
        {
          email: seedTarget.email,
          email_normalized: seedTarget.email.toLowerCase().trim(),
          full_name: seedTarget.full_name,
          role: seedTarget.role,
          is_homeroom: seedTarget.is_homeroom,
          is_demo: true,
          is_active: true,
        },
        { onConflict: 'email_normalized' }
      )
      .select('id, auth_user_id')
      .single()

    if (upsertError) {
      return NextResponse.json(
        { error: `Gagal menyiapkan profil demo: ${upsertError.message}` },
        { status: 500 }
      )
    }

    authUserId = upsertedProfile?.auth_user_id || null
  } else {
    targetEmail = existingProfile.email
  }

  // 2. Pastikan user di Supabase Auth sudah ada dan passwordnya sesuai
  try {
    if (!authUserId) {
      const { data: userList } = await adminClient.auth.admin.listUsers()
      const foundInAuth = userList?.users?.find(
        (u) => u.email?.toLowerCase() === targetEmail.toLowerCase().trim()
      )

      if (foundInAuth) {
        authUserId = foundInAuth.id
        await adminClient.auth.admin.updateUserById(authUserId, {
          password: demoPassword,
          email_confirm: true,
        })
      } else {
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: targetEmail,
          password: demoPassword,
          email_confirm: true,
        })

        if (createError) {
          return NextResponse.json(
            { error: `Gagal membuat akun auth demo: ${createError.message}` },
            { status: 500 }
          )
        }
        authUserId = newUser.user.id
      }

      // Hubungkan auth_user_id ke profiles
      if (authUserId) {
        await adminClient
          .from('profiles')
          .update({ auth_user_id: authUserId })
          .eq('email_normalized', targetEmail.toLowerCase().trim())
      }
    }
  } catch (authErr: unknown) {
    const msg = authErr instanceof Error ? authErr.message : String(authErr)
    return NextResponse.json(
      { error: `Gagal mengonfigurasi autentikasi demo: ${msg}` },
      { status: 500 }
    )
  }

  // 3. Login dan simpan cookie session LANGSUNG ke HTTP Response
  const redirectUrl = homePathForRole(role as Role)
  const response = NextResponse.json({ success: true, redirectUrl })

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

  let { error: signInError } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password: demoPassword,
  })

  // Jika password tidak cocok (misal auth.users punya password lama), sinkronkan password lalu coba lagi
  if (signInError && authUserId) {
    await adminClient.auth.admin.updateUserById(authUserId, {
      password: demoPassword,
      email_confirm: true,
    })
    const retryResult = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: demoPassword,
    })
    signInError = retryResult.error
  }

  if (signInError) {
    return NextResponse.json(
      { error: `Gagal masuk akun demo (${targetEmail}): ${signInError.message}` },
      { status: 500 }
    )
  }

  return response
}
