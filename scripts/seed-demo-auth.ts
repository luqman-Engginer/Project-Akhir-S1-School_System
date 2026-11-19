import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Helper pembaca file .env.local jika belum di-load ke process.env
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ''
        value = value.trim().replace(/^['"]|['"]$/g, '')
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
}

loadEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const demoPassword = process.env.DEMO_PASSWORD || 'sekolahku-demo-2026'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface DemoAccountSeed {
  email: string
  full_name: string
  role: 'admin' | 'teacher' | 'student' | 'parent'
  is_homeroom?: boolean
}

// 8 Akun Demo Sesuai Spesifikasi Tahap 5
const DEMO_ACCOUNTS: DemoAccountSeed[] = [
  // 1 Admin
  {
    email: 'admin.sari@demo.sekolahku.test',
    full_name: 'Bu Sari (Admin)',
    role: 'admin',
  },
  // 2 Guru (Pak Dedi sebagai wali kelas, Bu Lina)
  {
    email: 'guru.dedi@demo.sekolahku.test',
    full_name: 'Pak Dedi (Wali Kelas)',
    role: 'teacher',
    is_homeroom: true,
  },
  {
    email: 'guru.lina@demo.sekolahku.test',
    full_name: 'Bu Lina (Guru Mapel)',
    role: 'teacher',
    is_homeroom: false,
  },
  // 3 Murid (Raka, Nadia, Bima)
  {
    email: 'murid.raka@demo.sekolahku.test',
    full_name: 'Raka Pratama',
    role: 'student',
  },
  {
    email: 'murid.nadia@demo.sekolahku.test',
    full_name: 'Nadia Putri',
    role: 'student',
  },
  {
    email: 'murid.bima@demo.sekolahku.test',
    full_name: 'Bima Arya',
    role: 'student',
  },
  // 2 Ortu (Pak Hendra, Bu Wati)
  {
    email: 'ortu.hendra@demo.sekolahku.test',
    full_name: 'Pak Hendra (Ortu)',
    role: 'parent',
  },
  {
    email: 'ortu.wati@demo.sekolahku.test',
    full_name: 'Bu Wati (Ortu)',
    role: 'parent',
  },
]

async function seedDemoAuth() {
  console.log('--- Memulai Seeding Akun Demo Sekolahku ---')
  console.log(`Menggunakan password demo: ${demoPassword}\n`)

  for (const acc of DEMO_ACCOUNTS) {
    const normalizedEmail = acc.email.toLowerCase().trim()

    // 1. Masukkan atau perbarui profil di tabel profiles terlebih dahulu
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          email: acc.email,
          email_normalized: normalizedEmail,
          full_name: acc.full_name,
          role: acc.role,
          is_homeroom: acc.is_homeroom || false,
          is_demo: true,
          is_active: true,
        },
        { onConflict: 'email_normalized' }
      )
      .select('id, auth_user_id')
      .single()

    if (profileError) {
      console.error(`Gagal menyimpan profile [${acc.email}]:`, profileError.message)
      continue
    }

    // 2. Buat atau perbarui akun auth di auth.users lewat Admin API
    let authUserId: string | null = null

    // Cek apakah akun auth sudah ada
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = userList?.users.find((u) => u.email?.toLowerCase() === normalizedEmail)

    if (existingUser) {
      authUserId = existingUser.id
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: demoPassword,
        email_confirm: true,
      })
      if (updateError) {
        console.warn(`Update password user auth [${acc.email}] gagal:`, updateError.message)
      } else {
        console.log(`✓ Akun auth sudah ada & password diperbarui: ${acc.email} (${acc.role})`)
      }
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: acc.email,
        password: demoPassword,
        email_confirm: true,
      })

      if (createError) {
        console.error(`Gagal membuat akun auth [${acc.email}]:`, createError.message)
        continue
      }
      authUserId = newUser.user.id
      console.log(`✓ Berhasil membuat akun auth baru: ${acc.email} (${acc.role})`)
    }

    // 3. Pastikan profiles.auth_user_id terhubung
    if (authUserId && profile.auth_user_id !== authUserId) {
      await supabaseAdmin
        .from('profiles')
        .update({ auth_user_id: authUserId })
        .eq('id', profile.id)
    }
  }

  console.log('\n--- Seeding 8 Akun Demo Selesai ---')
}

seedDemoAuth().catch((err) => {
  console.error('Terjadi kesalahan tak terduga saat seeding:', err)
  process.exit(1)
})
