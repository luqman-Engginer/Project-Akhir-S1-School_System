import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OFFICIAL_DEMO_EMAILS = [
  'admin.sari@demo.sekolahku.test',
  'guru.dedi@demo.sekolahku.test',
  'guru.lina@demo.sekolahku.test',
  'murid.raka@demo.sekolahku.test',
  'murid.nadia@demo.sekolahku.test',
  'murid.bima@demo.sekolahku.test',
  'ortu.hendra@demo.sekolahku.test',
  'ortu.wati@demo.sekolahku.test',
];

async function cleanupExtraProfiles() {
  console.log('=== Pembersihan Akun Tambahan: Memastikan Total Akun Tepat 8 ===');

  const { data: extraProfiles, error } = await admin
    .from('profiles')
    .select('id, full_name, email, auth_user_id')
    .not('email', 'in', `(${OFFICIAL_DEMO_EMAILS.map((e) => `'${e}'`).join(',')})`);

  if (error) {
    console.error('Gagal membaca tabel profiles:', error.message);
    return;
  }

  if (!extraProfiles || extraProfiles.length === 0) {
    console.log('Semua profil sudah bersih! Hanya 8 akun resmi demo yang terdaftar.');
    return;
  }

  console.log(`Ditemukan ${extraProfiles.length} akun tambahan di luar 8 akun demo resmi.`);

  for (const prof of extraProfiles) {
    console.log(`- Menghapus profil: ${prof.full_name} (${prof.email})`);
    
    // Hapus auth user jika ada
    if (prof.auth_user_id) {
      await admin.auth.admin.deleteUser(prof.auth_user_id);
    }
    // Hapus profile
    await admin.from('profiles').delete().eq('id', prof.id);
  }

  console.log('Pembersihan selesai! Total akun demo kembali tepat 8.');
}

cleanupExtraProfiles().catch(console.error);
