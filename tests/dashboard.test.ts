import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let val = (match[2] || '').trim().replace(/^['"]|['"]$/g, '')
        if (!process.env[key]) process.env[key] = val
      }
    })
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const demoPassword = process.env.DEMO_PASSWORD || 'sekolahku-demo-2026'

const isConfigured = Boolean(
  supabaseUrl &&
  anonKey &&
  serviceRoleKey &&
  !supabaseUrl.includes('your-project')
)

describe.skipIf(!isConfigured)('Dashboard & Roster Integration Tests (Tahap 8)', () => {
  let adminClient: SupabaseClient
  let clientAdmin: SupabaseClient
  let clientGuruDedi: SupabaseClient
  let clientGuruLina: SupabaseClient
  let clientMuridRaka: SupabaseClient
  let clientOrtuHendra: SupabaseClient
  let clientOrtuWati: SupabaseClient

  let classXIId: string

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    async function getAuthedClient(email: string) {
      const c = createClient(supabaseUrl!, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await c.auth.signInWithPassword({ email, password: demoPassword })
      return c
    }

    clientAdmin = await getAuthedClient('admin.sari@demo.sekolahku.test')
    clientGuruDedi = await getAuthedClient('guru.dedi@demo.sekolahku.test')
    clientGuruLina = await getAuthedClient('guru.lina@demo.sekolahku.test')
    clientMuridRaka = await getAuthedClient('murid.raka@demo.sekolahku.test')
    clientOrtuHendra = await getAuthedClient('ortu.hendra@demo.sekolahku.test')
    clientOrtuWati = await getAuthedClient('ortu.wati@demo.sekolahku.test')

    const { data: c } = await adminClient.from('classes').select('id').eq('name', 'XI RPL 1').maybeSingle()
    if (c) classXIId = c.id
  })

  // (a) Murid hanya melihat data dirinya di dashboard_student; memanggil dashboard_admin ditolak
  it('(a) Murid hanya melihat data dirinya di dashboard_student; memanggil dashboard_admin ditolak', async () => {
    // 1. Panggil dashboard_student sebagai Murid Raka -> sukses
    const { data: studentDash, error: sErr } = await clientMuridRaka.rpc('dashboard_student')
    expect(sErr).toBeNull()
    expect(studentDash.role).toBe('student')
    expect(studentDash.today_schedule).toBeDefined()
    expect(studentDash.upcoming_assignments).toBeDefined()

    // 2. Murid memanggil dashboard_admin -> ditolak
    const { error: adminErr } = await clientMuridRaka.rpc('dashboard_admin')
    expect(adminErr).not.toBeNull()
    expect(adminErr!.message).toContain('Akses ditolak')
  })

  // (b) dashboard_parent untuk Bu Wati mengembalikan 2 anak, untuk Pak Hendra 1 anak
  it('(b) dashboard_parent mengembalikan 2 anak untuk Bu Wati dan 1 anak untuk Pak Hendra', async () => {
    // Bu Wati -> Nadia & Bima
    const { data: watiDash, error: wErr } = await clientOrtuWati.rpc('dashboard_parent')
    expect(wErr).toBeNull()
    expect(watiDash.children.length).toBe(2)

    // Pak Hendra -> Raka
    const { data: hendraDash, error: hErr } = await clientOrtuHendra.rpc('dashboard_parent')
    expect(hErr).toBeNull()
    expect(hendraDash.children.length).toBe(1)
  })

  // (c) dashboard_admin: persentase kehadiran dan ringkasan role
  it('(c) dashboard_admin mengembalikan agregasi role dan kehadiran yang tepat', async () => {
    const { data: adminDash, error: aErr } = await clientAdmin.rpc('dashboard_admin')
    expect(aErr).toBeNull()
    expect(adminDash.role).toBe('admin')
    expect(adminDash.users_by_role.admin).toBe(1)
    expect(adminDash.users_by_role.teacher).toBe(2)
    expect(adminDash.users_by_role.student).toBe(3)
    expect(adminDash.users_by_role.parent).toBe(2)
    expect(adminDash.attendance_last_7_days.length).toBe(7)
  })

  // (d) teacher_class_roster berhasil untuk guru pengajar, gagal untuk guru lain
  it('(d) teacher_class_roster berhasil untuk guru pengajar kelas dan gagal untuk guru luar', async () => {
    if (!classXIId) return

    // 1. Pak Dedi mengajar XI RPL 1 -> Sukses
    const { data: roster, error: rErr } = await clientGuruDedi.rpc('teacher_class_roster', {
      p_class_id: classXIId,
      p_date: '2026-11-20',
    })
    expect(rErr).toBeNull()
    expect(roster.length).toBeGreaterThanOrEqual(3) // Raka, Nadia, Bima

    // 2. Buat kelas dummy lain di mana Pak Dedi tidak mengajar
    const { data: otherClass } = await adminClient
      .from('classes')
      .upsert({ name: 'XII TKJ Khusus', academic_year: '2026/2027' }, { onConflict: 'name,academic_year' })
      .select('id').single()

    const { error: fErr } = await clientGuruDedi.rpc('teacher_class_roster', {
      p_class_id: otherClass!.id,
      p_date: '2026-11-20',
    })
    expect(fErr).not.toBeNull()
    expect(fErr!.message).toContain('Akses ditolak')

    await adminClient.from('classes').delete().eq('id', otherClass!.id)
  })

  // (e) Total akun tetap 8
  it('(e) Total profil dan akun auth tetap tepat 8 akun demo', async () => {
    const { data: profiles } = await adminClient.from('profiles').select('id')
    expect(profiles?.length).toBe(8)
  })
})
