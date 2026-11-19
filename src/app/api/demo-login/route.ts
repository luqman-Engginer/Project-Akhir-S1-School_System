import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { homePathForRole, type Role } from '@/lib/auth/roles'
import { checkRateLimit } from '@/lib/rateLimit'

const demoLoginSchema = z.object({
  role: z.enum(['admin', 'teacher', 'student', 'parent']),
})

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

  // Ambil satu akun demo sesuai role dari tabel profiles
  const adminClient = createAdminClient()
  const { data: demoProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('email, role')
    .eq('is_demo', true)
    .eq('role', role)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (profileError || !demoProfile) {
    return NextResponse.json(
      { error: `Akun demo untuk role ${role} belum tersedia di database` },
      { status: 404 }
    )
  }

  const demoPassword = process.env.DEMO_PASSWORD
  if (!demoPassword) {
    return NextResponse.json(
      { error: 'DEMO_PASSWORD belum dikonfigurasi di environment variable server' },
      { status: 500 }
    )
  }

  // Login server-side menggunakan sesi cookies
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: demoProfile.email,
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
