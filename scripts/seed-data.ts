import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function seedData() {
  console.log('=== Memulai Seeding Data Akademik & Komunikasi Lengkap ===\n')

  // 1. Ambil 8 Akun Profil Demo yang sudah dibuat sebelumnya
  const { data: profiles, error: pErr } = await admin.from('profiles').select('id, email, role')
  if (pErr || !profiles || profiles.length < 8) {
    console.error('Harap jalankan "npm run seed:demo" terlebih dahulu untuk membuat 8 akun demo.')
    process.exit(1)
  }

  const pMap = new Map(profiles.map((p) => [p.email, p.id]))

  const sariId = pMap.get('admin.sari@demo.sekolahku.test')!
  const dediId = pMap.get('guru.dedi@demo.sekolahku.test')!
  const linaId = pMap.get('guru.lina@demo.sekolahku.test')!
  const rakaId = pMap.get('murid.raka@demo.sekolahku.test')!
  const nadiaId = pMap.get('murid.nadia@demo.sekolahku.test')!
  const bimaId = pMap.get('murid.bima@demo.sekolahku.test')!
  const hendraId = pMap.get('ortu.hendra@demo.sekolahku.test')!
  const watiId = pMap.get('ortu.wati@demo.sekolahku.test')!

  // Pastikan Pak Dedi ditandai is_homeroom = true
  await admin.from('profiles').update({ is_homeroom: true }).eq('id', dediId)

  // 2. Kelas XI RPL 1 (Wali kelas: Pak Dedi)
  const { data: classObj, error: cErr } = await admin
    .from('classes')
    .upsert(
      {
        name: 'XI RPL 1',
        academic_year: '2026/2027',
        homeroom_teacher_id: dediId,
      },
      { onConflict: 'name,academic_year' }
    )
    .select('id')
    .single()

  if (cErr) throw cErr
  const classId = classObj.id
  console.log(`✓ Kelas: XI RPL 1 (${classId})`)

  // 3. Murid masuk XI RPL 1: Raka, Nadia, Bima
  await admin.from('student_classes').upsert([
    { student_id: rakaId, class_id: classId },
    { student_id: nadiaId, class_id: classId },
    { student_id: bimaId, class_id: classId },
  ])
  console.log('✓ 3 Murid (Raka, Nadia, Bima) terdaftar di XI RPL 1')

  // 4. Hubungan Orang Tua: Hendra -> Raka, Wati -> Nadia & Bima
  await admin.from('parent_students').upsert([
    { parent_id: hendraId, student_id: rakaId },
    { parent_id: watiId, student_id: nadiaId },
    { parent_id: watiId, student_id: bimaId },
  ])
  console.log('✓ Relasi Orang Tua: Pak Hendra -> Raka; Bu Wati -> Nadia & Bima')

  // 5. Mata Pelajaran: Pemrograman Web (Pak Dedi) & Basis Data (Bu Lina)
  const { data: subWeb } = await admin
    .from('subjects')
    .upsert({ name: 'Pemrograman Web' }, { onConflict: 'name' })
    .select('id')
    .single()

  const { data: subDb } = await admin
    .from('subjects')
    .upsert({ name: 'Basis Data' }, { onConflict: 'name' })
    .select('id')
    .single()

  // Teachings
  const { data: tchWeb } = await admin
    .from('teachings')
    .upsert(
      { teacher_id: dediId, subject_id: subWeb!.id, class_id: classId },
      { onConflict: 'teacher_id,subject_id,class_id' }
    )
    .select('id')
    .single()

  const { data: tchDb } = await admin
    .from('teachings')
    .upsert(
      { teacher_id: linaId, subject_id: subDb!.id, class_id: classId },
      { onConflict: 'teacher_id,subject_id,class_id' }
    )
    .select('id')
    .single()

  console.log('✓ Mapel & Penugasan Guru (teachings) terkonfigurasi')

  // 6. Jadwal 1 Minggu (Senin-Jumat, 2-3 sesi per hari tanpa bentrok)
  // Bersihkan jadwal lama kelas ini agar idempotent
  await admin.from('schedules').delete().in('teaching_id', [tchWeb!.id, tchDb!.id])

  const scheduleList = [
    // Senin (1)
    { teaching_id: tchWeb!.id, day_of_week: 1, start_time: '07:30', end_time: '09:30' },
    { teaching_id: tchDb!.id, day_of_week: 1, start_time: '10:00', end_time: '12:00' },
    // Selasa (2)
    { teaching_id: tchDb!.id, day_of_week: 2, start_time: '08:00', end_time: '10:00' },
    { teaching_id: tchWeb!.id, day_of_week: 2, start_time: '10:30', end_time: '12:30' },
    // Rabu (3)
    { teaching_id: tchWeb!.id, day_of_week: 3, start_time: '07:30', end_time: '09:30' },
    { teaching_id: tchDb!.id, day_of_week: 3, start_time: '10:00', end_time: '12:00' },
    // Kamis (4)
    { teaching_id: tchDb!.id, day_of_week: 4, start_time: '08:00', end_time: '10:00' },
    { teaching_id: tchWeb!.id, day_of_week: 4, start_time: '10:30', end_time: '12:30' },
    // Jumat (5)
    { teaching_id: tchWeb!.id, day_of_week: 5, start_time: '07:30', end_time: '09:30' },
    { teaching_id: tchDb!.id, day_of_week: 5, start_time: '09:45', end_time: '11:15' },
  ]

  await admin.from('schedules').insert(scheduleList)
  console.log('✓ Jadwal 1 pekan (Senin-Jumat) tersimpan')

  // 7. Absensi 5 Hari Kerja Terakhir (Senin-Jumat)
  // Mayoritas hadir, Raka sakit 1 hari (H-2), Bima alpa 1 hari (H-1), Nadia izin 1 hari (H-3)
  const today = new Date()
  const workDays: string[] = []

  let dayOffset = 0
  while (workDays.length < 5) {
    const d = new Date(today)
    d.setDate(today.getDate() - dayOffset)
    const dow = d.getDay() // 0 = Sun, 6 = Sat
    if (dow !== 0 && dow !== 6) {
      workDays.push(d.toISOString().split('T')[0])
    }
    dayOffset++
  }
  workDays.reverse() // Urut dari paling lampau ke hari ini

  const [d1, d2, d3, d4, d5] = workDays

  interface SeedAttendance {
    class_id: string
    student_id: string
    date: string
    status: 'present' | 'sick' | 'excused' | 'absent'
    note?: string | null
    recorded_by: string
  }

  const attendanceRecords: SeedAttendance[] = [
    // d1: Semua hadir
    { class_id: classId, student_id: rakaId, date: d1, status: 'present', recorded_by: dediId, note: null },
    { class_id: classId, student_id: nadiaId, date: d1, status: 'present', recorded_by: dediId, note: null },
    { class_id: classId, student_id: bimaId, date: d1, status: 'present', recorded_by: dediId, note: null },

    // d2: Nadia izin (excused)
    { class_id: classId, student_id: rakaId, date: d2, status: 'present', recorded_by: dediId, note: null },
    { class_id: classId, student_id: nadiaId, date: d2, status: 'excused', note: 'Izin urusan keluarga', recorded_by: dediId },
    { class_id: classId, student_id: bimaId, date: d2, status: 'present', recorded_by: dediId, note: null },

    // d3: Raka sakit (sick)
    { class_id: classId, student_id: rakaId, date: d3, status: 'sick', note: 'Surat dokter terlampir', recorded_by: dediId },
    { class_id: classId, student_id: nadiaId, date: d3, status: 'present', recorded_by: dediId, note: null },
    { class_id: classId, student_id: bimaId, date: d3, status: 'present', recorded_by: dediId, note: null },

    // d4: Bima alpa (absent)
    { class_id: classId, student_id: rakaId, date: d4, status: 'present', recorded_by: dediId, note: null },
    { class_id: classId, student_id: nadiaId, date: d4, status: 'present', recorded_by: dediId, note: null },
    { class_id: classId, student_id: bimaId, date: d4, status: 'absent', note: 'Tanpa kabar', recorded_by: dediId },

    // d5: Semua hadir
    { class_id: classId, student_id: rakaId, date: d5, status: 'present', recorded_by: dediId, note: null },
    { class_id: classId, student_id: nadiaId, date: d5, status: 'present', recorded_by: dediId, note: null },
    { class_id: classId, student_id: bimaId, date: d5, status: 'present', recorded_by: dediId, note: null },
  ]

  for (const att of attendanceRecords) {
    await admin.from('attendance').upsert(att, { onConflict: 'student_id,class_id,date' })
  }
  console.log('✓ Catatan absensi 5 hari kerja tersimpan (Raka sakit 1x, Bima alpa 1x, Nadia izin 1x)')

  // 8. 3 Tugas (Assignments) & Pengumpulan (Submissions)
  // (1) Deadline kemarin
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: asg1 } = await admin
    .from('assignments')
    .insert({
      teaching_id: tchWeb!.id,
      title: 'Tugas 1: Dasar HTML & CSS',
      description: 'Buat landing page responsif sederhana untuk portofolio',
      deadline: yesterday,
    })
    .select('id')
    .single()

  // (2) Deadline 3 hari lagi
  const in3Days = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
  const { data: asg2 } = await admin
    .from('assignments')
    .insert({
      teaching_id: tchDb!.id,
      title: 'Tugas 2: Desain ERD Database Toko',
      description: 'Normalisasi tabel sampai bentuk 3NF',
      deadline: in3Days,
    })
    .select('id')
    .single()

  // (3) Deadline 1 hari lagi
  const in1Day = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  const { data: asg3 } = await admin
    .from('assignments')
    .insert({
      teaching_id: tchWeb!.id,
      title: 'Tugas 3: JavaScript DOM Manipulation',
      description: 'Implementasi to-do list interaktif',
      deadline: in1Day,
    })
    .select('id')
    .single()

  // Submissions untuk Tugas 1:
  // - Raka sudah dinilai (85)
  await admin.from('submissions').upsert(
    {
      assignment_id: asg1!.id,
      student_id: rakaId,
      content_url: 'https://github.com/raka/html-css-portfolio',
      submitted_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      status: 'graded',
      score: 85,
      feedback: 'Struktur kode rapi, tampilan responsif sangat baik.',
      graded_by: dediId,
      graded_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    },
    { onConflict: 'assignment_id,student_id' }
  )

  // - Nadia kumpul terlambat (submitted_at > deadline) dan belum dinilai
  await admin.from('submissions').upsert(
    {
      assignment_id: asg1!.id,
      student_id: nadiaId,
      content_url: 'https://github.com/nadia/tugas-html',
      submitted_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), // setelah deadline kemarin
      status: 'submitted',
    },
    { onConflict: 'assignment_id,student_id' }
  )

  // - Bima belum kumpul (tidak ada baris)

  // Submissions untuk Tugas 3:
  // - Nadia sudah kumpul (tepat waktu, belum dinilai)
  await admin.from('submissions').upsert(
    {
      assignment_id: asg3!.id,
      student_id: nadiaId,
      content_url: 'https://github.com/nadia/js-dom-todo',
      submitted_at: new Date().toISOString(),
      status: 'submitted',
    },
    { onConflict: 'assignment_id,student_id' }
  )

  console.log('✓ 3 Tugas dan submissions tersimpan sesuai skenario keterlambatan dan penilaian')

  // 9. 2 Pengumuman
  // (a) Target 'all' (disematkan)
  await admin.from('announcements').insert({
    author_id: sariId,
    target: 'all',
    title: 'Pekan Penilaian Tengah Semester (PTS) Genap',
    body: 'Diberitahukan kepada seluruh dewan guru, siswa, dan orang tua bahwa PTS akan dilaksanakan pekan depan. Harap mempersiapkan perangkat belajar dengan baik.',
    is_pinned: true,
  })

  // (b) Target 'class' untuk XI RPL 1
  await admin.from('announcements').insert({
    author_id: dediId,
    target: 'class',
    class_id: classId,
    title: 'Persiapan Praktik Kerja Lapangan (PKL)',
    body: 'Siswa kelas XI RPL 1 wajib mengumpulkan berkas formulir pemilihan industri paling lambat hari Jumat ini ke wali kelas.',
    is_pinned: false,
  })

  console.log('✓ 2 Pengumuman tersimpan (Umum disematkan & Khusus Kelas XI RPL 1)')

  // 10. 2 Thread Percakapan
  // (a) Ortu Raka (Pak Hendra) <-> Pak Dedi, kategori 'leave', 3 pesan
  const { data: th1 } = await admin
    .from('threads')
    .insert({
      category: 'leave',
      subject: 'Izin Tidak Masuk Raka (Demam)',
      student_id: rakaId,
      created_by: hendraId,
      status: 'replied',
    })
    .select('id')
    .single()

  await admin.from('thread_participants').upsert([
    { thread_id: th1!.id, user_id: hendraId, last_read_at: new Date().toISOString() },
    { thread_id: th1!.id, user_id: dediId, last_read_at: new Date().toISOString() },
  ])

  await admin.from('messages').insert([
    { thread_id: th1!.id, sender_id: hendraId, body: 'Selamat pagi Pak Dedi, mohon izin ananda Raka hari ini demam tinggi dan perlu istirahat.' },
    { thread_id: th1!.id, sender_id: dediId, body: 'Selamat pagi Pak Hendra. Baik, surat dokter mohon diunggah lewat menu izin ya pak. Semoga Raka lekas pulih.' },
    { thread_id: th1!.id, sender_id: hendraId, body: 'Baik pak Dedi, surat dokter sudah kami ajukan di aplikasi. Terima kasih banyak.' },
  ])

  // (b) Nadia <-> Bu Lina, kategori 'assignment', 2 pesan
  const { data: th2 } = await admin
    .from('threads')
    .insert({
      category: 'assignment',
      subject: 'Pertanyaan Desain Normalisasi 3NF',
      student_id: nadiaId,
      created_by: nadiaId,
      status: 'replied',
    })
    .select('id')
    .single()

  await admin.from('thread_participants').upsert([
    { thread_id: th2!.id, user_id: nadiaId, last_read_at: new Date().toISOString() },
    { thread_id: th2!.id, user_id: linaId, last_read_at: new Date().toISOString() },
  ])

  await admin.from('messages').insert([
    { thread_id: th2!.id, sender_id: nadiaId, body: 'Selamat siang Bu Lina, untuk tabel transaksi apakah field total harga perlu dipisah ke tabel detail?' },
    { thread_id: th2!.id, sender_id: linaId, body: 'Halo Nadia, betul, untuk bentuk 3NF total harga sebaiknya dihitung dinamis atau ditaruh di header setelah detail divalidasi.' },
  ])

  console.log('✓ 2 Thread percakapan tersimpan (Ortu-Guru 3 pesan & Murid-Guru 2 pesan)')

  // 11. 1 Leave Request milik Raka berstatus 'pending'
  await admin.from('leave_requests').insert({
    student_id: rakaId,
    submitted_by: hendraId,
    date_from: new Date().toISOString().split('T')[0],
    date_to: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
    reason: 'Raka istirahat pemulihan demam sesuai anjuran dokter',
    type: 'sick',
    status: 'pending',
  })
  console.log('✓ 1 Surat izin sakit milik Raka tersimpan (status pending)')

  // 12. Notifikasi Contoh untuk Setiap Peran (Minimal 2 per role, kombinasi read & unread)
  const sampleNotifs = [
    // Admin
    { user_id: sariId, type: 'announcement', title: 'Laporan Mingguan Sistem', body: 'Laporan kehadiran mingguan telah siap dianalisis.', is_read: false },
    { user_id: sariId, type: 'reminder', title: 'Sinkronisasi Backup', body: 'Backup database otomatis berhasil dilaksanakan.', is_read: true },
    // Guru Dedi
    { user_id: dediId, type: 'leave', title: 'Pengajuan Izin: Raka Pratama', body: 'Pak Hendra mengajukan surat sakit untuk Raka.', is_read: false },
    { user_id: dediId, type: 'assignment', title: 'Pengumpulan Tugas Baru', body: 'Nadia mengumpulkan tugas Pemrograman Web.', is_read: true },
    // Guru Lina
    { user_id: linaId, type: 'message', title: 'Pesan dari Nadia Putri', body: 'Pertanyaan Desain Normalisasi 3NF', is_read: false },
    { user_id: linaId, type: 'announcement', title: 'Pengumuman PTS', body: 'Jadwal pengawas PTS telah diterbitkan.', is_read: true },
    // Murid Raka
    { user_id: rakaId, type: 'grade', title: 'Nilai Tugas: Dasar HTML & CSS', body: 'Tugas Anda telah dinilai oleh Pak Dedi: 85.', is_read: false },
    { user_id: rakaId, type: 'assignment', title: 'Tugas Baru: JS DOM', body: 'Tugas baru JavaScript DOM Manipulation telah dibuat.', is_read: true },
    // Murid Nadia
    { user_id: nadiaId, type: 'message', title: 'Balasan dari Bu Lina', body: 'Pertanyaan Desain Normalisasi 3NF', is_read: false },
    { user_id: nadiaId, type: 'reminder', title: 'Pengingat Deadline', body: 'Tugas Basis Data tersisa 3 hari.', is_read: true },
    // Murid Bima
    { user_id: bimaId, type: 'reminder', title: 'Tugas Terlambat', body: 'Tugas 1 Dasar HTML belum dikumpulkan.', is_read: false },
    { user_id: bimaId, type: 'attendance', title: 'Kehadiran Hari Ini', body: 'Status kehadiran tercatat hadir.', is_read: true },
    // Ortu Hendra
    { user_id: hendraId, type: 'attendance', title: 'Kehadiran Raka Pratama', body: 'Raka tercatat sakit pada hari ini.', is_read: false },
    { user_id: hendraId, type: 'grade', title: 'Nilai Raka Pratama', body: 'Tugas Dasar HTML & CSS Raka mendapat nilai 85.', is_read: true },
    // Ortu Wati
    { user_id: watiId, type: 'attendance', title: 'Kehadiran Bima Arya', body: 'Bima tercatat alpa pada pekan ini.', is_read: false },
    { user_id: watiId, type: 'announcement', title: 'Pengumuman PTS', body: 'Jadwal PTS Genap telah diterbitkan.', is_read: true },
  ]

  for (const n of sampleNotifs) {
    await admin.from('notifications').insert(n)
  }
  console.log('✓ 16 Notifikasi sampel dibuat (kombinasi read & unread untuk 8 akun)')

  console.log('\n=== Seeding Data Akademik & Komunikasi Berhasil Sempurna! ===')
}

seedData().catch((err) => {
  console.error('Gagal melakukan seed data:', err)
  process.exit(1)
})
