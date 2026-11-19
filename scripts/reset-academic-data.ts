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

// PENGAMAN KETAT: Tolak jika lingkungan production
if (process.env.NODE_ENV === 'production') {
  console.error('FATAL: Perintah seed:reset DILARANG dijalankan di environment production!')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Kredensial Supabase belum terkonfigurasi di .env.local')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function resetAcademicData() {
  console.log('--- Menghapus Data Akademik & Komunikasi Demo (Akun & Profil Tetap Utuh) ---')

  // Hapus berurutan sesuai relasi foreign key
  await admin.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('thread_participants').delete().neq('thread_id', '00000000-0000-0000-0000-000000000000')
  await admin.from('threads').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('announcement_reads').delete().neq('announcement_id', '00000000-0000-0000-0000-000000000000')
  await admin.from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('assignment_reminders').delete().neq('assignment_id', '00000000-0000-0000-0000-000000000000')
  await admin.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('leave_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('teachings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('student_classes').delete().neq('student_id', '00000000-0000-0000-0000-000000000000')
  await admin.from('parent_students').delete().neq('parent_id', '00000000-0000-0000-0000-000000000000')
  await admin.from('classes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('✓ Seluruh data transaksi akademik & komunikasi berhasil dibersihkan.')
  console.log('Menjalankan ulang seeding data...\n')

  // Jalankan seed-data
  const { execSync } = await import('child_process')
  execSync('node --experimental-strip-types scripts/seed-data.ts', { stdio: 'inherit' })
}

resetAcademicData().catch((err) => {
  console.error('Reset gagal:', err)
  process.exit(1)
})
