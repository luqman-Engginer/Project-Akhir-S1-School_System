import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const emailInput = args[0]
const nameInput = args[1] || 'Administrator'

if (!emailInput) {
  console.log(`
Penggunaan:
  npm run add:admin <email_gmail> [nama_lengkap]

Contoh:
  npm run add:admin myemail@gmail.com "Budi Santoso"
`)
  process.exit(1)
}

const normalizedEmail = emailInput.toLowerCase().trim()

if (!normalizedEmail.endsWith('@gmail.com')) {
  console.error('Error: Email harus berupa akun @gmail.com sesuai aturan sistem.')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function registerAdmin() {
  console.log(`\n--- Mendaftarkan Admin Baru ---`)
  console.log(`Email : ${normalizedEmail}`)
  console.log(`Nama  : ${nameInput}\n`)

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        email: normalizedEmail,
        email_normalized: normalizedEmail,
        full_name: nameInput,
        role: 'admin',
        is_homeroom: false,
        is_demo: false,
        is_active: true,
      },
      { onConflict: 'email_normalized' }
    )
    .select('id, email, role, full_name')
    .single()

  if (error) {
    console.error('Gagal mendaftarkan admin:', error.message)
    process.exit(1)
  }

  console.log('✓ Berhasil mendaftarkan admin ke tabel profiles!')
  console.log(`Sekarang Anda dapat login dengan tombol "Masuk dengan Google" menggunakan akun: ${profile.email}\n`)
}

registerAdmin()
