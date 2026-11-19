# Sekolahku — Sistem Sekolah Simple untuk SMK

Aplikasi sistem informasi sekolah terpadu yang dirancang khusus untuk SMK, menghubungkan **Guru, Murid, Orang Tua, dan Admin** dalam satu antarmuka yang hangat, sederhana, ringan, dan bebas dari kerumitan template AI.

Dibangun dengan prinsip **Aksesibilitas Tinggi**, **Privasi Data Ketat (RLS)**, dan **Efisiensi Administrasi** (absen kelas tuntas dalam 1 menit).

---

## 🌟 Fitur Utama Berdasarkan Peran

### 1. 🛡️ Admin Sekolah (`/admin`)
- **Dashboard Eksekutif**: Grafik tren kehadiran 7 hari, grafik rerata nilai per kelas, dan kartu indikator warga sekolah.
- **Kelola Pengguna**: Pendaftaran akun baru dengan validasi Gmail & deteksi typo cerdas (misal: `gmai.com` &rarr; `gmail.com`), pencegahan trik duplikasi titik/plus Gmail (`normalize_gmail`), kunci email setelah login, filter "Data yang perlu dilengkapi", dan proteksi larangan menonaktifkan admin terakhir.
- **Kelola Rombel & Kurikulum**: Pengaturan kelas per tahun ajaran, kurikulum mata pelajaran unik, alokasi guru pengampu (`teachings`), dan penempatan murid (1 murid 1 kelas aktif).
- **Jadwal KBM Bebas Bentrok**: Penyusunan jadwal sesi mengajar mingguan dengan validasi otomatis bentrok jam ruang kelas dan bentrok guru di kelas lain.
- **Rekapitulasi Akademik Baca-Saja**: Pemantauan persentase kehadiran 30 hari dan distribusi nilai tanpa tombol manipulasi data.
- **Siaran Pengumuman**: Publikasi pengumuman sekolah bertarget (semua warga, kelas tertentu, atau wali murid), sematkan di urutan teratas, dan statistik pembaca transparan.

### 2. 👨‍🏫 Guru Pengampu & Wali Kelas (`/guru`)
- **Absensi Kelas 1 Menit**: Seluruh murid default "Hadir", guru hanya perlu mengubah murid yang sakit, izin, atau alpa.
- **Verifikasi Izin Siswa**: Memeriksa alasan dan berkas lampiran surat dokter yang diajukan orang tua/murid, lalu menyetujui atau menolak permohonan secara real-time.
- **Manajemen Tugas & Nilai**: Membuat tugas baru dengan deadline dan berkas panduan, menerima kiriman siswa, serta memeriksa dan memberikan nilai (skala 0-100) beserta umpan balik teks.
- **Pesan Konsultasi Privat**: Thread percakapan dua arah dengan murid atau wali murid. Privasi terjamin (ortu tidak bisa membaca pesan guru-murid dan sebaliknya).

### 3. 🎓 Murid SMK (`/murid`)
- **Beranda Harian Cerdas**: Menjawab tuntas *"Hari ini ada apa?"* dengan sapaan waktu Indonesia, jadwal pelajaran hari ini, dan penanda tugas mendesak (< 24 jam).
- **Pengumpulan Tugas**: Mengunggah jawaban berkas atau tautan dengan catatan pengerjaan sebelum batas waktu terlampaui.
- **Transkrip Nilai & Jadwal**: Memeriksa nilai yang diberikan guru beserta umpan balik edukatif.
- **Permohonan Izin**: Mengajukan izin tidak masuk sekolah jika berhalangan.

### 4. 👨‍👩‍👧 Orang Tua / Wali Murid (`/ortu`)
- **Pemantauan Perkembangan Anak**: Memantau status kehadiran harian, tren absensi 30 hari, serta perkembangan nilai tugas seluruh mata pelajaran.
- **Pengalih Anak (Child Switcher)**: Untuk orang tua yang memiliki lebih dari satu anak bersekolah di SMK ini (misal: Bu Wati untuk Nadia dan Bima).
- **Pengajuan Izin Sakit**: Mengirimkan surat permohonan izin langsung dari HP lengkap dengan foto/file surat dokter.
- **Pesan Langsung ke Guru**: Berkonsultasi dengan wali kelas atau guru mata pelajaran tanpa terganggu pesan publik.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/)
- **Bahasa**: TypeScript (Strict Mode)
- **Styling & Desain**: Tailwind CSS v4 + Design Tokens Ramah Aksesibilitas (WCAG AA)
- **Database & Backend**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Auth Google, Storage, Realtime)
- **Visualisasi Data**: [Recharts](https://recharts.org/) (Lazy loaded dengan alternatif Screen Reader)
- **Validasi Data**: [Zod](https://zod.dev/)
- **Unit Testing**: [Vitest](https://vitest.dev/) (100 tests passed)
- **Deployment**: [Vercel](https://vercel.com/) (Edge Middleware + Daily Cron)

---

## 👥 8 Akun Resmi Demo (Password: `sekolahku-demo-2026`)

Untuk kemudahan pengujian dan evaluasi, aplikasi dilengkapi rute cepat `/demo` yang memungkinkan penguji berganti peran hanya dengan satu kali klik:

| No | Peran / Role | Nama Akun | Email Demo | Keterangan |
| :-: | :--- | :--- | :--- | :--- |
| 1 | **Admin** | Bu Sari (Admin) | `admin.sari@demo.sekolahku.test` | Akses penuh modul master data & rekap |
| 2 | **Guru** | Pak Dedi (Wali Kelas) | `guru.dedi@demo.sekolahku.test` | Wali Kelas XI RPL 1 & Guru Pemrograman Web |
| 3 | **Guru** | Bu Lina | `guru.lina@demo.sekolahku.test` | Guru Basis Data |
| 4 | **Murid** | Raka | `murid.raka@demo.sekolahku.test` | Siswa XI RPL 1 (Anak Pak Hendra) |
| 5 | **Murid** | Nadia | `murid.nadia@demo.sekolahku.test` | Siswa XI RPL 1 (Anak Bu Wati) |
| 6 | **Murid** | Bima | `murid.bima@demo.sekolahku.test` | Siswa XI RPL 1 (Anak Bu Wati) |
| 7 | **Orang Tua** | Pak Hendra | `ortu.hendra@demo.sekolahku.test` | Wali murid dari Raka |
| 8 | **Orang Tua** | Bu Wati | `ortu.wati@demo.sekolahku.test` | Wali murid dari Nadia dan Bima |

---

## 🚀 Panduan Menjalankan Secara Lokal

### 1. Prasyarat
- Node.js versi 20+ atau 24+
- Proyek Supabase aktif (gratis di supabase.com)

### 2. Kloning Repositori & Instalasi Dependensi
```bash
git clone <URL_REPO_ANDA>
cd "Project Akhir S1 School_System"
npm install
```

### 3. Konfigurasi Environment Variable (`.env.local`)
Salin file `.env.example` menjadi `.env.local`, lalu lengkapi variabel berikut:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DEMO_MODE=true
DEMO_PASSWORD=sekolahku-demo-2026
CRON_SECRET=sekolahku-cron-secret-2026
```

### 4. Eksekusi Migrasi & Data Seeding
Jalankan migrasi database di Supabase SQL Editor (dari berkas `supabase/migrations/0001_...` sampai `0011_...`), kemudian jalankan seeding akun dan data akademik:
```bash
# 1. Buat 8 akun profil & autentikasi demo resmi
npm run seed:demo

# 2. Isi data rombel, jadwal, materi, tugas, dan percakapan
npm run seed:data

# 3. Jalankan unit test (harus 100 passed)
npm test
```

### 5. Jalankan Server Development
```bash
npm run dev
```
Buka browser di `http://localhost:3000`. Untuk mencoba seluruh peran, buka `http://localhost:3000/demo`.

---

## ☁️ Panduan Deploy ke Vercel

### 1. Pengaturan Environment Variable di Vercel Dashboard
Tambahkan variabel berikut pada menu **Settings > Environment Variables** (centang untuk *Production* dan *Preview*):
1. `NEXT_PUBLIC_SUPABASE_URL`: URL API Supabase Anda.
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Public Key Supabase.
3. `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key Supabase (rahasia server).
4. `NEXT_PUBLIC_SITE_URL`: Domain resmi Vercel Anda (misal: `https://sekolahku.vercel.app`).
5. `DEMO_MODE`: Beri nilai `true` untuk demonstrasi/sidang, atau `false` untuk produksi tertutup.
6. `DEMO_PASSWORD`: `sekolahku-demo-2026`.
7. `CRON_SECRET`: Kunci rahasia untuk trigger cron job notifikasi.

### 2. Langkah Pengaturan Manual Wajib di Supabase & Google Cloud Console
1. **Supabase Authentication > URL Configuration**:
   - **Site URL**: Isi dengan URL domain Vercel Anda (contoh: `https://sekolahku.vercel.app`).
   - **Redirect URLs**: Tambahkan:
     - `http://localhost:3000/auth/callback`
     - `https://sekolahku.vercel.app/auth/callback`
2. **Google Cloud Console > Credentials > OAuth 2.0 Client IDs**:
   - **Authorized redirect URIs**: Pastikan redirect URI bawaan Supabase sudah terdaftar (`https://<PROJECT_REF>.supabase.co/auth/v1/callback`).
   - **Authorized JavaScript origins**: Tambahkan domain Vercel Anda (`https://sekolahku.vercel.app`).

### 3. Batasan Paket Gratis Vercel (Hobby Cron)
Paket gratis Vercel Hobby membatasi cron job maksimal **1 kali per hari**. Konfigurasi pada `vercel.json` telah disesuaikan menggunakan jadwal harian `"schedule": "0 1 * * *"` (jam 08.00 WIB setiap pagi) untuk memeriksa tugas yang mendekati batas waktu (*due soon*) dan membersihkan notifikasi usang.

### 4. Uji Asap Otomatis (Smoke Test Pasca-Deploy)
Setelah aplikasi tayang di Vercel, jalankan uji respons endpoint dari terminal:
```bash
npm run smoke https://sekolahku.vercel.app
```

---

## ⚠️ Catatan Sangat Penting: Proyek Supabase Gratis (Auto-Pause)

> [!IMPORTANT]
> Proyek Supabase pada paket gratis (*Free Plan*) akan **otomatis di-pause (dinonaktifkan sementara)** oleh Supabase jika tidak menerima request database selama **7 hari berturut-turut**.
> 
> **Tindakan Pencegahan Sebelum Sidang / Presentasi:**
> 1. Buka aplikasi di browser **1 hari atau beberapa jam sebelum presentasi/pengumpulan**.
> 2. Jika muncul pesan kendala database atau halaman tertahan, masuk ke [Supabase Dashboard](https://supabase.com/dashboard) &rarr; klik tombol hijau **"Restore Project"**.
> 3. Proses restorasi memerlukan waktu sekitar 1–2 menit, setelah itu sistem akan kembali aktif normal 100%.

---

## 🛡️ Keamanan & Kepatuhan Data

- **Content-Security-Policy (CSP)** yang ketat tanpa mengganggu WebSocket Realtime dan Google OAuth.
- **Row Level Security (RLS)** di seluruh tabel skema publik.
- **Proteksi Rahasia**: Kunci `SUPABASE_SERVICE_ROLE_KEY` 0% berada di bundle JavaScript browser.
- **Rate Limiting**: Endpoint publik dilindungi pembatas laju request in-memory untuk menangkal serangan spam.

---

## 📄 Dokumentasi Tambahan

- [docs/DEMO_SCRIPT.md](file:///d:/Project%20Akhir%20S1%20School_System/docs/DEMO_SCRIPT.md): Naskah demonstrasi alur kerja 7 langkah lengkap untuk presentasi.
- [docs/DEFINITION_OF_DONE.md](file:///d:/Project%20Akhir%20S1%20School_System/docs/DEFINITION_OF_DONE.md): Matriks evaluasi kriteria selesai PRD dan daftar rencana pengembangan lanjutan untuk laporan.
- [docs/UI_AUDIT.md](file:///d:/Project%20Akhir%20S1%20School_System/docs/UI_AUDIT.md): Laporan audit konsistensi desain, aksesibilitas WCAG AA, dan skor Lighthouse.
- [docs/SECURITY_NOTES.md](file:///d:/Project%20Akhir%20S1%20School_System/docs/SECURITY_NOTES.md): Catatan teknis arsitektur keamanan web, CSP, dan audit dependensi.
