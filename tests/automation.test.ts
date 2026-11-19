import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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

describe.skipIf(!isConfigured)('Automated Triggers & Storage Tests', () => {
  let adminClient: SupabaseClient
  let clientGuruDedi: SupabaseClient
  let clientMuridRaka: SupabaseClient
  let clientMuridBima: SupabaseClient
  let clientOrtuHendra: SupabaseClient
  let clientOrtuWati: SupabaseClient

  let rakaId: string
  let bimaId: string
  let hendraId: string
  let watiId: string
  let dediId: string
  let classId: string
  let classBId: string
  let teachingId: string

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

    clientGuruDedi = await getAuthedClient('guru.dedi@demo.sekolahku.test')
    clientMuridRaka = await getAuthedClient('murid.raka@demo.sekolahku.test')
    clientMuridBima = await getAuthedClient('murid.bima@demo.sekolahku.test')
    clientOrtuHendra = await getAuthedClient('ortu.hendra@demo.sekolahku.test')
    clientOrtuWati = await getAuthedClient('ortu.wati@demo.sekolahku.test')

    const { data: profiles } = await adminClient.from('profiles').select('id, email')
    const pMap = new Map(profiles?.map((p) => [p.email, p.id]))

    dediId = pMap.get('guru.dedi@demo.sekolahku.test')!
    rakaId = pMap.get('murid.raka@demo.sekolahku.test')!
    bimaId = pMap.get('murid.bima@demo.sekolahku.test')!
    hendraId = pMap.get('ortu.hendra@demo.sekolahku.test')!
    watiId = pMap.get('ortu.wati@demo.sekolahku.test')!

    // Relasi ortu-murid
    await adminClient.from('parent_students').upsert([
      { parent_id: hendraId, student_id: rakaId },
      { parent_id: watiId, student_id: bimaId },
    ])

    // Kelas
    const { data: cA } = await adminClient
      .from('classes')
      .upsert({ name: 'X-RPL-AUTO-A', academic_year: '2026/2027', homeroom_teacher_id: dediId }, { onConflict: 'name,academic_year' })
      .select('id').single()
    classId = cA!.id

    const { data: cB } = await adminClient
      .from('classes')
      .upsert({ name: 'X-RPL-AUTO-B', academic_year: '2026/2027' }, { onConflict: 'name,academic_year' })
      .select('id').single()
    classBId = cB!.id

    // Penempatan murid
    await adminClient.from('student_classes').upsert([
      { student_id: rakaId, class_id: classId },
      { student_id: bimaId, class_id: classBId },
    ])

    // Mapel & teaching
    const { data: sub } = await adminClient
      .from('subjects')
      .upsert({ name: 'Dasar Auto' }, { onConflict: 'name' })
      .select('id').single()

    const { data: tch } = await adminClient
      .from('teachings')
      .upsert({ teacher_id: dediId, subject_id: sub!.id, class_id: classId }, { onConflict: 'teacher_id,subject_id,class_id' })
      .select('id').single()
    teachingId = tch!.id
  })

  afterAll(async () => {
    if (classId) await adminClient.from('classes').delete().eq('id', classId)
    if (classBId) await adminClient.from('classes').delete().eq('id', classBId)
  })

  it('(a) Absen sick membuat tepat 1 notifikasi ke ortu, present tidak membuat notifikasi', async () => {
    const testDate = '2026-11-25'
    await adminClient.from('notifications').delete().eq('user_id', hendraId)

    // 1. Absen sick
    await clientGuruDedi.from('attendance').upsert({
      class_id: classId,
      student_id: rakaId,
      date: testDate,
      status: 'sick',
      recorded_by: dediId,
    })

    const { data: notifSick } = await adminClient
      .from('notifications')
      .select('*')
      .eq('user_id', hendraId)
      .eq('type', 'attendance')
    expect(notifSick?.length).toBe(1)
    expect(notifSick![0].body).toContain('sakit')

    // 2. Upsert ulang dengan status yang sama -> tidak membuat notifikasi baru
    await clientGuruDedi.from('attendance').upsert({
      class_id: classId,
      student_id: rakaId,
      date: testDate,
      status: 'sick',
      recorded_by: dediId,
    })

    const { data: notifSickRepeat } = await adminClient
      .from('notifications')
      .select('*')
      .eq('user_id', hendraId)
      .eq('type', 'attendance')
    expect(notifSickRepeat?.length).toBe(1)

    // 3. Absen present baru pada tanggal berbeda -> tidak membuat notifikasi
    const testDate2 = '2026-11-26'
    await clientGuruDedi.from('attendance').upsert({
      class_id: classId,
      student_id: rakaId,
      date: testDate2,
      status: 'present',
      recorded_by: dediId,
    })

    const { data: notifPresent } = await adminClient
      .from('notifications')
      .select('*')
      .eq('user_id', hendraId)
      .eq('type', 'attendance')
    // Jumlah notifikasi tetap 1
    expect(notifPresent?.length).toBe(1)
  })

  it('(b) Izin disetujui hanya membuat attendance hari kerja dan tidak menimpa present', async () => {
    // Tanggal: Jumat 2026-11-20 s/d Minggu 2026-11-22
    // Jumat: sudah tercatat present duluan
    await adminClient.from('attendance').upsert({
      class_id: classId,
      student_id: rakaId,
      date: '2026-11-20',
      status: 'present',
      recorded_by: dediId,
    })

    // Buat izin sakit Jumat s/d Minggu
    const { data: lr } = await adminClient
      .from('leave_requests')
      .insert({
        student_id: rakaId,
        submitted_by: rakaId,
        date_from: '2026-11-20',
        date_to: '2026-11-22',
        reason: 'Sakit flu',
        type: 'sick',
        status: 'pending',
      })
      .select('id').single()

    // Guru Dedi menyetujui izin
    await clientGuruDedi
      .from('leave_requests')
      .update({ status: 'approved' })
      .eq('id', lr!.id)

    // 1. Jumat 2026-11-20 tetap 'present' (tidak ditimpa)
    const { data: attJumat } = await adminClient
      .from('attendance')
      .select('status')
      .eq('student_id', rakaId)
      .eq('date', '2026-11-20')
      .single()
    expect(attJumat?.status).toBe('present')

    // 2. Sabtu 2026-11-21 & Minggu 2026-11-22 tidak dibuatkan baris absensi
    const { data: attWeekend } = await adminClient
      .from('attendance')
      .select('*')
      .eq('student_id', rakaId)
      .in('date', ['2026-11-21', '2026-11-22'])
    expect(attWeekend?.length).toBe(0)
  })

  it('(c) Tugas baru membuat notifikasi ke murid dan ortu kelas itu, tidak ke kelas lain', async () => {
    await adminClient.from('notifications').delete().in('user_id', [rakaId, hendraId, bimaId, watiId])

    await clientGuruDedi.from('assignments').insert({
      teaching_id: teachingId,
      title: 'Tugas Notifikasi Auto',
      deadline: new Date(Date.now() + 86400000).toISOString(),
    })

    // Murid Raka dan Ortu Hendra dapat notifikasi
    const { data: notifRaka } = await adminClient.from('notifications').select('*').eq('user_id', rakaId)
    const { data: notifHendra } = await adminClient.from('notifications').select('*').eq('user_id', hendraId)
    expect(notifRaka?.length).toBeGreaterThan(0)
    expect(notifHendra?.length).toBeGreaterThan(0)

    // Murid Bima dan Ortu Wati di Kelas B TIDAK dapat notifikasi tugas kelas A
    const { data: notifBima } = await adminClient.from('notifications').select('*').eq('user_id', bimaId)
    const { data: notifWati } = await adminClient.from('notifications').select('*').eq('user_id', watiId)
    expect(notifBima?.length || 0).toBe(0)
    expect(notifWati?.length || 0).toBe(0)
  })

  it('(d) Pesan baru menotifikasi peserta lain tanpa membocorkan isi, status thread berubah', async () => {
    // 1. Ortu Hendra membuat thread ke Guru Dedi
    const { data: threadId } = await clientOrtuHendra.rpc('create_thread', {
      p_category: 'consultation',
      p_subject: 'Tanya Nilai Raka',
      p_student_id: rakaId,
      p_recipient_ids: [dediId],
      p_first_message: 'Isi pesan rahasia ortu hendra',
    })

    // 2. Guru Dedi menerima notifikasi baru tanpa isi pesan
    const { data: notifDedi } = await adminClient
      .from('notifications')
      .select('*')
      .eq('user_id', dediId)
      .eq('type', 'message')
      .order('created_at', { ascending: false })
      .limit(1)

    expect(notifDedi![0].body).toContain('Tanya Nilai Raka')
    expect(notifDedi![0].body).not.toContain('Isi pesan rahasia')

    // 3. Guru Dedi membalas pesan -> status berubah menjadi 'replied'
    await clientGuruDedi.from('messages').insert({
      thread_id: threadId,
      sender_id: dediId,
      body: 'Balasan dari guru dedi',
    })

    const { data: th } = await adminClient.from('threads').select('status').eq('id', threadId).single()
    expect(th?.status).toBe('replied')
  })

  it('(e) Pengumuman target class tidak sampai ke ortu kelas lain', async () => {
    await adminClient.from('notifications').delete().in('user_id', [hendraId, watiId])

    await clientGuruDedi.from('announcements').insert({
      author_id: dediId,
      target: 'class',
      class_id: classId,
      title: 'Khusus Kelas A',
      body: 'Info hanya untuk kelas A',
    })

    const { data: notifHendra } = await adminClient.from('notifications').select('*').eq('user_id', hendraId)
    const { data: notifWati } = await adminClient.from('notifications').select('*').eq('user_id', watiId)

    expect(notifHendra?.length).toBeGreaterThan(0)
    expect(notifWati?.length || 0).toBe(0)
  })

  it('(f) notify_due_soon tidak mengirim dobel jika dijalankan dua kali', async () => {
    // 1. Buat tugas dengan deadline 12 jam dari sekarang
    const { data: asg } = await adminClient
      .from('assignments')
      .insert({
        teaching_id: teachingId,
        title: 'Tugas Deadline Dekat',
        deadline: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      })
      .select('id').single()

    // Eksekusi pertama
    const { data: count1 } = await adminClient.rpc('notify_due_soon')
    expect(count1).toBeGreaterThanOrEqual(1)

    // Eksekusi kedua -> harus 0 karena sudah dicatat di assignment_reminders
    const { data: count2 } = await adminClient.rpc('notify_due_soon')
    expect(count2).toBe(0)

    await adminClient.from('assignments').delete().eq('id', asg!.id)
  })
})
