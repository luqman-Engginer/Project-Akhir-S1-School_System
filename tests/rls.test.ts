import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Helper pembaca file .env.local
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

describe.skipIf(!isConfigured)('RLS Automated Security Suite (Matriks Privasi)', () => {
  let adminClient: SupabaseClient
  let anonClient: SupabaseClient

  // Klien per role demo
  let clientAdmin: SupabaseClient
  let clientGuruDedi: SupabaseClient // Wali kelas & guru
  let clientGuruLina: SupabaseClient // Guru mapel luar
  let clientMuridRaka: SupabaseClient // Murid Pak Hendra
  let clientMuridNadia: SupabaseClient // Murid Bu Wati
  let clientMuridBima: SupabaseClient // Murid Bu Wati
  let clientOrtuHendra: SupabaseClient // Ortu Raka
  let clientOrtuWati: SupabaseClient // Ortu Nadia & Bima

  // Fixture IDs
  let classAId: string
  let classBId: string
  let teachingAId: string
  let assignmentAId: string
  let submissionRakaId: string
  let threadGuruMuridId: string

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    anonClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Helper login client
    async function createAuthedClient(email: string) {
      const client = createClient(supabaseUrl!, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { error } = await client.auth.signInWithPassword({
        email,
        password: demoPassword,
      })
      if (error) throw new Error(`Login gagal untuk ${email}: ${error.message}`)
      return client
    }

    clientAdmin = await createAuthedClient('admin.sari@demo.sekolahku.test')
    clientGuruDedi = await createAuthedClient('guru.dedi@demo.sekolahku.test')
    clientGuruLina = await createAuthedClient('guru.lina@demo.sekolahku.test')
    clientMuridRaka = await createAuthedClient('murid.raka@demo.sekolahku.test')
    clientMuridNadia = await createAuthedClient('murid.nadia@demo.sekolahku.test')
    clientMuridBima = await createAuthedClient('murid.bima@demo.sekolahku.test')
    clientOrtuHendra = await createAuthedClient('ortu.hendra@demo.sekolahku.test')
    clientOrtuWati = await createAuthedClient('ortu.wati@demo.sekolahku.test')

    // --- SETUP FIXTURE KELAS & RELASI ---
    // Ambil profile IDs
    const { data: profiles } = await adminClient.from('profiles').select('id, email')
    const pMap = new Map(profiles?.map((p) => [p.email, p.id]))

    const dediId = pMap.get('guru.dedi@demo.sekolahku.test')!
    const rakaId = pMap.get('murid.raka@demo.sekolahku.test')!
    const nadiaId = pMap.get('murid.nadia@demo.sekolahku.test')!
    const bimaId = pMap.get('murid.bima@demo.sekolahku.test')!
    const hendraId = pMap.get('ortu.hendra@demo.sekolahku.test')!
    const watiId = pMap.get('ortu.wati@demo.sekolahku.test')!

    // Hubungkan relasi ortu-murid
    await adminClient.from('parent_students').upsert([
      { parent_id: hendraId, student_id: rakaId },
      { parent_id: watiId, student_id: nadiaId },
      { parent_id: watiId, student_id: bimaId },
    ])

    // Buat Kelas A (Dedi = wali kelas) dan Kelas B
    const { data: cA } = await adminClient
      .from('classes')
      .upsert({ name: 'X-RPL-RLS-A', academic_year: '2026/2027', homeroom_teacher_id: dediId }, { onConflict: 'name,academic_year' })
      .select('id').single()
    classAId = cA!.id

    const { data: cB } = await adminClient
      .from('classes')
      .upsert({ name: 'X-RPL-RLS-B', academic_year: '2026/2027' }, { onConflict: 'name,academic_year' })
      .select('id').single()
    classBId = cB!.id

    // Masukkan murid ke kelas
    await adminClient.from('student_classes').upsert([
      { student_id: rakaId, class_id: classAId },
      { student_id: nadiaId, class_id: classAId },
      { student_id: bimaId, class_id: classBId },
    ])

    // Mapel dan penugasan Dedi mengajar di Kelas A
    const { data: sub } = await adminClient
      .from('subjects')
      .upsert({ name: 'Pemrograman Web RLS' }, { onConflict: 'name' })
      .select('id').single()

    const { data: tch } = await adminClient
      .from('teachings')
      .upsert({ teacher_id: dediId, subject_id: sub!.id, class_id: classAId }, { onConflict: 'teacher_id,subject_id,class_id' })
      .select('id').single()
    teachingAId = tch!.id

    // Buat Tugas di Kelas A
    const { data: asg } = await adminClient
      .from('assignments')
      .insert({
        teaching_id: teachingAId,
        title: 'Tugas HTML RLS',
        deadline: new Date(Date.now() + 86400000).toISOString(),
      })
      .select('id').single()
    assignmentAId = asg!.id

    // Submission Raka
    const { data: subRaka } = await adminClient
      .from('submissions')
      .insert({
        assignment_id: assignmentAId,
        student_id: rakaId,
        content_url: 'https://github.com/raka/tugas',
        score: 85,
      })
      .select('id').single()
    submissionRakaId = subRaka!.id

    // Thread rahasia Guru Dedi <-> Murid Raka
    const { data: th } = await adminClient
      .from('threads')
      .insert({
        category: 'consultation',
        subject: 'Rahasia Murid Raka dan Guru Dedi',
        student_id: rakaId,
        created_by: dediId,
      })
      .select('id').single()
    threadGuruMuridId = th!.id

    await adminClient.from('thread_participants').insert([
      { thread_id: threadGuruMuridId, user_id: dediId },
      { thread_id: threadGuruMuridId, user_id: rakaId },
    ])

    await adminClient.from('messages').insert({
      thread_id: threadGuruMuridId,
      sender_id: dediId,
      body: 'Pesan rahasia konseling untuk Raka',
    })
  })

  afterAll(async () => {
    // Bersihkan data fixture
    if (threadGuruMuridId) await adminClient.from('threads').delete().eq('id', threadGuruMuridId)
    if (assignmentAId) await adminClient.from('assignments').delete().eq('id', assignmentAId)
    if (classAId) await adminClient.from('classes').delete().eq('id', classAId)
    if (classBId) await adminClient.from('classes').delete().eq('id', classBId)
  })

  // (a) Ortu Raka TIDAK bisa membaca thread guru-murid milik Raka
  it('(a) Ortu Raka TIDAK bisa membaca thread guru-murid milik Raka', async () => {
    const { data: threads } = await clientOrtuHendra
      .from('threads')
      .select('*')
      .eq('id', threadGuruMuridId)
    expect(threads?.length || 0).toBe(0)

    const { data: messages } = await clientOrtuHendra
      .from('messages')
      .select('*')
      .eq('thread_id', threadGuruMuridId)
    expect(messages?.length || 0).toBe(0)
  })

  // (b) Ortu Raka tidak bisa melihat nilai/absensi Nadia (anak ortu lain)
  it('(b) Ortu Raka tidak bisa melihat nilai/absensi Nadia (anak ortu lain)', async () => {
    const { data: profiles } = await adminClient.from('profiles').select('id, email')
    const nadiaId = profiles?.find((p) => p.email === 'murid.nadia@demo.sekolahku.test')?.id!

    const { data: subNadia } = await clientOrtuHendra
      .from('submissions')
      .select('*')
      .eq('student_id', nadiaId)
    expect(subNadia?.length || 0).toBe(0)

    const { data: attNadia } = await clientOrtuHendra
      .from('attendance')
      .select('*')
      .eq('student_id', nadiaId)
    expect(attNadia?.length || 0).toBe(0)
  })

  // (c) Bu Wati (ortu Nadia dan Bima) bisa melihat KEDUA anaknya
  it('(c) Bu Wati (ortu Nadia dan Bima) bisa melihat data KEDUA anaknya', async () => {
    const { data: profiles } = await adminClient.from('profiles').select('id, email')
    const nadiaId = profiles?.find((p) => p.email === 'murid.nadia@demo.sekolahku.test')?.id!
    const bimaId = profiles?.find((p) => p.email === 'murid.bima@demo.sekolahku.test')?.id!

    const { data: children } = await clientOrtuWati
      .from('parent_students')
      .select('student_id')
    const studentIds = children?.map((c) => c.student_id) || []

    expect(studentIds).toContain(nadiaId)
    expect(studentIds).toContain(bimaId)
  })

  // (d) Murid tidak bisa melihat nilai murid lain
  it('(d) Murid tidak bisa melihat nilai murid lain', async () => {
    const { data: submissions } = await clientMuridNadia
      .from('submissions')
      .select('*')
      .eq('id', submissionRakaId)
    expect(submissions?.length || 0).toBe(0)
  })

  // (e) Murid tidak bisa mengubah score miliknya sendiri
  it('(e) Murid tidak bisa mengubah score miliknya sendiri', async () => {
    const { error } = await clientMuridRaka
      .from('submissions')
      .update({ score: 100 })
      .eq('id', submissionRakaId)

    // Harus ditolak oleh RLS / Trigger
    expect(error).not.toBeNull()
  })

  // (f) Guru yang tidak mengajar kelas itu tidak bisa membaca atau menulis absensi kelas tersebut
  it('(f) Guru Lina (tidak mengajar Kelas A) tidak bisa membaca/menulis absensi Kelas A', async () => {
    const { data: profiles } = await adminClient.from('profiles').select('id, email')
    const rakaId = profiles?.find((p) => p.email === 'murid.raka@demo.sekolahku.test')?.id!

    // Baca absensi
    const { data: att } = await clientGuruLina
      .from('attendance')
      .select('*')
      .eq('class_id', classAId)
    expect(att?.length || 0).toBe(0)

    // Tulis absensi -> harus gagal
    const { error } = await clientGuruLina.from('attendance').insert({
      class_id: classAId,
      student_id: rakaId,
      date: '2026-11-20',
      status: 'present',
      recorded_by: profiles?.find((p) => p.email === 'guru.lina@demo.sekolahku.test')?.id!,
    })
    expect(error).not.toBeNull()
  })

  // (g) Admin bisa membaca absensi tapi gagal menulis absensi, dan gagal membaca messages
  it('(g) Admin bisa membaca absensi tapi gagal menulis absensi, dan gagal membaca messages', async () => {
    const { data: profiles } = await adminClient.from('profiles').select('id, email')
    const adminId = profiles?.find((p) => p.email === 'admin.sari@demo.sekolahku.test')?.id!
    const rakaId = profiles?.find((p) => p.email === 'murid.raka@demo.sekolahku.test')?.id!

    // 1. Admin membaca absensi -> diizinkan oleh can_view_student()
    const { error: readAttError } = await clientAdmin.from('attendance').select('*')
    expect(readAttError).toBeNull()

    // 2. Admin menulis absensi -> ditolak oleh policy attendance_teacher_insert (NOT is_admin())
    const { error: insertAttError } = await clientAdmin.from('attendance').insert({
      class_id: classAId,
      student_id: rakaId,
      date: '2026-11-20',
      status: 'present',
      recorded_by: adminId,
    })
    expect(insertAttError).not.toBeNull()

    // 3. Admin membaca pesan chat privat -> ditolak oleh policy messages_participant_select
    const { data: msgs } = await clientAdmin
      .from('messages')
      .select('*')
      .eq('thread_id', threadGuruMuridId)
    expect(msgs?.length || 0).toBe(0)
  })

  // (h) Client anon tidak bisa membaca tabel apa pun
  it('(h) Client anon tidak bisa membaca tabel apa pun', async () => {
    const tables = ['profiles', 'classes', 'attendance', 'messages', 'notifications']
    for (const tbl of tables) {
      const { data, error } = await anonClient.from(tbl).select('*').limit(1)
      expect(data === null || data.length === 0).toBe(true)
      expect(error).not.toBeNull()
    }
  })

  // (i) Ortu tidak bisa memanggil create_thread ke guru yang tidak mengajar anaknya
  it('(i) Ortu tidak bisa memanggil create_thread ke guru yang tidak mengajar anaknya', async () => {
    const { data: profiles } = await adminClient.from('profiles').select('id, email')
    const rakaId = profiles?.find((p) => p.email === 'murid.raka@demo.sekolahku.test')?.id!
    const linaId = profiles?.find((p) => p.email === 'guru.lina@demo.sekolahku.test')?.id!

    // Guru Lina tidak mengajar di kelas Raka
    const { error } = await clientOrtuHendra.rpc('create_thread', {
      p_category: 'consultation',
      p_subject: 'Konsultasi Ilegal',
      p_student_id: rakaId,
      p_recipient_ids: [linaId],
      p_first_message: 'Halo bu lina',
    })
    expect(error).not.toBeNull()
  })

  // (j) User tidak bisa insert notifikasi langsung untuk orang lain
  it('(j) User tidak bisa insert notifikasi langsung untuk orang lain', async () => {
    const { data: profiles } = await adminClient.from('profiles').select('id, email')
    const rakaId = profiles?.find((p) => p.email === 'murid.raka@demo.sekolahku.test')?.id!

    // Nadia mencoba inject notifikasi ke akun Raka
    const { error } = await clientMuridNadia.from('notifications').insert({
      user_id: rakaId,
      type: 'reminder',
      title: 'Palsu',
      body: 'Spam notifikasi',
    })
    expect(error).not.toBeNull()
  })

  // (k) Murid tidak bisa menyetujui izin; wali kelas bisa
  it('(k) Murid tidak bisa menyetujui izin; wali kelas bisa', async () => {
    const { data: profiles } = await adminClient.from('profiles').select('id, email')
    const rakaId = profiles?.find((p) => p.email === 'murid.raka@demo.sekolahku.test')?.id!

    // Ajukan izin oleh Raka
    const { data: lr } = await clientMuridRaka
      .from('leave_requests')
      .insert({
        student_id: rakaId,
        date_from: '2026-11-21',
        date_to: '2026-11-22',
        reason: 'Sakit flu',
        type: 'sick',
        status: 'pending',
      })
      .select('id').single()

    // 1. Murid Raka mencoba menyetujui iznnya sendiri -> GAGAL
    const { error: muridUpdateError } = await clientMuridRaka
      .from('leave_requests')
      .update({ status: 'approved' })
      .eq('id', lr!.id)
    expect(muridUpdateError).not.toBeNull()

    // 2. Guru Dedi (wali kelas Raka) menyetujui izin -> SUKSES
    const { error: waliUpdateError } = await clientGuruDedi
      .from('leave_requests')
      .update({ status: 'approved', review_note: 'Semoga lekas sembuh' })
      .eq('id', lr!.id)
    expect(waliUpdateError).toBeNull()

    // Bersihkan
    await adminClient.from('leave_requests').delete().eq('id', lr!.id)
  })
})
