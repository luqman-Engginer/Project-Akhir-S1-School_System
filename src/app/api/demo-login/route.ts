import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { homePathForRole, type Role } from '@/lib/auth/roles'
import { checkRateLimit } from '@/lib/rateLimit'

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

  // Rate Limiting per IP (maksimal 15 request per menit)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous-demo'
  const rateLimitKey = `demo-login:${ip}`
  const { isAllowed } = checkRateLimit(rateLimitKey, 15, 60_000)

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

  let adminClient
  try {
    adminClient = createAdminClient()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Konfigurasi server belum lengkap: ${msg}` },
      { status: 500 }
    )
  }

  // 1. Cek apakah akun demo sudah terdaftar di tabel profiles
  const { data: demoProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('email, role')
    .eq('is_demo', true)
    .eq('role', role)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  let targetEmail = demoProfile?.email

  // 2. Jika tabel belum ada, berikan instruksi ramah
  if (profileError) {
    if (profileError.message.includes('relation') || profileError.code === '42P01') {
      return NextResponse.json(
        {
          error:
            'Tabel database belum dibuat di Supabase. Silakan jalankan file migrasi SQL di SQL Editor Supabase terlebih dahulu.',
        },
        { status: 500 }
      )
    }
  }

  // 3. Jika akun demo belum ada di tabel profiles, otomatis lakukan inisialisasi on-the-fly
  if (!targetEmail) {
    const seedTarget = DEFAULT_DEMO_ACCOUNTS[role as Role]
    if (!seedTarget) {
      return NextResponse.json(
        { error: `Akun demo untuk role ${role} belum tersedia di database.` },
        { status: 404 }
      )
    }

    try {
      // Cek/buat user di Supabase Auth Admin
      let authUserId: string | null = null
      const { data: userList } = await adminClient.auth.admin.listUsers()
      const existingUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === seedTarget.email.toLowerCase()
      )

      if (existingUser) {
        authUserId = existingUser.id
        await adminClient.auth.admin.updateUserById(authUserId, {
          password: demoPassword,
          email_confirm: true,
        })
      } else {
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: seedTarget.email,
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

      // Simpan ke tabel profiles
      const { error: upsertError } = await adminClient.from('profiles').upsert(
        {
          auth_user_id: authUserId,
          email: seedTarget.email,
          email_normalized: seedTarget.email.toLowerCase(),
          full_name: seedTarget.full_name,
          role: seedTarget.role,
          is_homeroom: seedTarget.is_homeroom,
          is_demo: true,
          is_active: true,
        },
        { onConflict: 'email_normalized' }
      )

      if (upsertError) {
        return NextResponse.json(
          { error: `Gagal menyimpan profil demo: ${upsertError.message}` },
          { status: 500 }
        )
      }

      targetEmail = seedTarget.email
    } catch (provisionErr: unknown) {
      const msg = provisionErr instanceof Error ? provisionErr.message : String(provisionErr)
      return NextResponse.json(
        { error: `Gagal menginisialisasi akun demo: ${msg}` },
        { status: 500 }
      )
    }
  }

  // 4. Login server-side menggunakan sesi cookies
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password: demoPassword,
  })

  if (signInError) {
    return NextResponse.json(
      { error: `Gagal login akun demo: ${signInError.message}` },
      { status: 500 }
    )
  }

  const redirectUrl = homePathForRole(role as Role)
  return NextResponse.json({ success: true, redirectUrl })
}
