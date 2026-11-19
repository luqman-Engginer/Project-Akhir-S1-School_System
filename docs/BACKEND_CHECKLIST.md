# Backend Contract & Security Checklist: "Sekolahku"

Dokumen ini merupakan kontrak resmi arsitektur backend, spesifikasi API/RPC, dan daftar verifikasi keamanan untuk implementasi Frontend.

---

## 1. Inventaris Tabel Database (Schema `public`)

Seluruh tabel telah menerapkan **Row Level Security (RLS)** dengan hak akses tertutup (*deny by default*). Akses publik role `anon` ditolak secara total.

| No | Nama Tabel | Deskripsi | Operasi yang Diizinkan |
| :--- | :--- | :--- | :--- |
| 1 | `profiles` | Data profil pengguna (Admin, Guru, Murid, Ortu) | SELECT: Pemilik, Guru binaan, Ortu anak, Admin. INSERT/DELETE: Admin. UPDATE: Admin & Pemilik (hanya `phone`). |
| 2 | `classes` | Data rombel / kelas SMK | SELECT: Warga kelas & Admin. INSERT/UPDATE/DELETE: Admin. |
| 3 | `subjects` | Mata pelajaran kurikulum | SELECT: Semua akun aktif. INSERT/UPDATE/DELETE: Admin. |
| 4 | `teachings` | Penugasan guru mengajar mapel di kelas | SELECT: Warga kelas & Admin. INSERT/UPDATE/DELETE: Admin. |
| 5 | `schedules` | Jadwal mingguan sesi KBM | SELECT: Warga kelas & Admin. INSERT/UPDATE/DELETE: Admin. |
| 6 | `student_classes` | Penempatan murid ke kelas (1 murid 1 kelas) | SELECT: Murid ybs, Ortu ybs, Guru kelas, Admin. INSERT/UPDATE/DELETE: Admin. |
| 7 | `parent_students` | Tautan akun orang tua dengan anak murid | SELECT: Ortu ybs, Murid ybs, Guru kelas, Admin. INSERT/UPDATE/DELETE: Admin. |
| 8 | `attendance` | Pencatatan absensi harian per kelas | SELECT: Murid ybs, Ortu ybs, Guru kelas, Admin. INSERT/UPDATE: Guru kelas. DELETE: Dilarang. |
| 9 | `leave_requests` | Surat izin / sakit dari murid atau ortu | SELECT: Murid ybs, Ortu ybs, Wali kelas, Admin. INSERT: Murid/Ortu ybs. UPDATE: Wali kelas saja. DELETE: Dilarang. |
| 10 | `assignments` | Tugas mata pelajaran dari guru | SELECT: Warga kelas & Admin. INSERT/UPDATE/DELETE: Guru pengajar mapel tsb. |
| 11 | `submissions` | Pengumpulan tugas murid dan penilaian guru | SELECT: Murid ybs, Ortu ybs, Guru kelas, Admin. INSERT/UPDATE: Murid ybs (sebelum dinilai) & Guru (skor/feedback). DELETE: Dilarang. |
| 12 | `announcements` | Pengumuman sekolah (all, class, parents) | SELECT: Sesuai target. INSERT/UPDATE/DELETE: Penulis pengumuman (Guru/Admin). |
| 13 | `announcement_reads` | Jejak baca pengumuman | SELECT: Pembaca ybs & Penulis pengumuman. INSERT: Pembaca ybs. |
| 14 | `threads` | Utas pesan/chat konsultasi | SELECT: Peserta saja (**Admin dilarang**). INSERT: Via RPC `create_thread`. UPDATE: Peserta (hanya guru yang boleh set `done`). |
| 15 | `thread_participants`| Peserta percakapan | SELECT: Peserta saja (**Admin dilarang**). UPDATE: Pemilik row (`last_read_at`). |
| 16 | `messages` | Pesan permanen dalam thread | SELECT: Peserta thread saja (**Admin dilarang**). INSERT: Peserta thread. UPDATE/DELETE: Dilarang (permanen). |
| 17 | `notifications` | Notifikasi dalam aplikasi | SELECT & UPDATE (`is_read`): Penerima notifikasi saja. INSERT: Otomatis via trigger/RPC. |
| 18 | `assignment_reminders`| Penanda pengingat deadline tugas (<24 jam) | Internal trigger & Cron. |

---

## 2. Kontrak Fungsi RPC untuk Frontend

Semua fungsi di bawah ini hanya dapat dieksekusi oleh pengguna yang terautentikasi (`TO authenticated`), otomatis mengidentifikasi pemanggil lewat `auth.uid()`, dan me-return payload JSONB yang ramah frontend.

### 2.1 Dashboard Endpoints
| Fungsi RPC | Pemanggil yang Diizinkan | Parameter | Tipe Kembalian (JSONB) | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| `dashboard_student()` | Murid (`student`) | *None* | `StudentDashboard` | Jadwal KBM hari ini, tugas mendatang + status, nilai terbaru, pesan & notifikasi belum dibaca. |
| `dashboard_teacher()` | Guru (`teacher`) | *None* | `TeacherDashboard` | Kelas hari ini, tugas yang perlu dinilai, pesan baru yang belum dibalas, permohonan izin pending (khusus wali), status absen kelas hari ini. |
| `dashboard_parent()` | Orang Tua (`parent`) | *None* | `ParentDashboard` | Array data per anak (kehadiran hari ini, tugas telat, nilai terbaru, tugas mendatang), pengumuman terbaru, dan unread pesan. |
| `dashboard_admin()` | Admin (`admin`) | *None* | `AdminDashboard` | Metrik pengguna per role, % kehadiran hari ini, tren kehadiran 7 hari terakhir, rerata nilai per kelas, daftar murid tingkat absensi tinggi, pengumuman terbaru. |

### 2.2 Helper Akademik & Profil
| Fungsi RPC | Pemanggil yang Diizinkan | Parameter | Tipe Kembalian | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| `parent_child_summary(p_student_id)` | Ortu, Murid ybs, Guru pengajar, Admin | `p_student_id: uuid` | `jsonb` (`ParentChildSummary`) | Rekap perkembangan 1 anak: % absensi 30 hari, 10 absen terakhir, daftar tugas & nilai, rerata skor per mapel. |
| `teacher_class_roster(p_class_id, p_date)` | Guru pengajar kelas tsb | `p_class_id: uuid`, `p_date: date` | `jsonb` (`ClassRosterItem[]`) | Daftar murid kelas beserta status absen pada tanggal tsb (default 'present') untuk form absen 1 menit. |
| `get_unread_notification_count()` | Semua pengguna login | *None* | `integer` | Jumlah notifikasi belum dibaca untuk badge lonceng. |
| `update_my_phone(p_phone)` | Pemilik akun | `p_phone: text` | `void` | Memperbarui nomor telepon profil sendiri dengan validasi nomor Indonesia. |

### 2.3 Komunikasi & Chat
| Fungsi RPC | Pemanggil yang Diizinkan | Parameter | Tipe Kembalian | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| `create_thread(...)` | Ortu, Murid, Guru | `p_category`, `p_subject`, `p_student_id`, `p_recipient_ids[]`, `p_first_message` | `uuid` (thread_id) | Membuka utas percakapan baru dengan validasi matriks privasi ketat (Ortu <-> Guru, Murid <-> Guru). |
| `mark_thread_read(p_thread_id)` | Peserta thread | `p_thread_id: uuid` | `void` | Memperbarui timestamp `last_read_at` dan otomatis mengubah status thread `new` -> `read` saat dibuka non-pembuat. |
| `unread_count(p_thread_id)` | Peserta thread | `p_thread_id: uuid` | `integer` | Menghitung jumlah pesan masuk setelah `last_read_at` (pesan orang lain). |
| `send_parent_reminder(student_id, text)` | Orang tua murid ybs | `student_id: uuid`, `text: text` | `uuid` | Mengirim pesan pengingat ortu ke murid (maks. 5x per hari, terisolasi dari chat privat murid). |

---

## 3. Daftar Environment Variable

| Variabel | Sifat | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client & Server) | URL Project Supabase | `https://xyzproject.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client & Server) | Anon Public API Key | `eyJh...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret (Server Only)** | Service Role Key bypass RLS untuk seeding & admin API | `eyJh...` |
| `NEXT_PUBLIC_SITE_URL` | Public (Client & Server) | Alamat domain aplikasi | `http://localhost:3000` atau `https://sekolahku.vercel.app` |
| `DEMO_MODE` | Server / Config | Menentukan ketersediaan login instan demo | `true` atau `false` |
| `DEMO_PASSWORD` | **Secret (Server Only)** | Password akun dummy demo | `sekolahku-demo-2026` |
| `CRON_SECRET` | **Secret (Server Only)** | Token otorisasi Vercel Cron untuk `/api/cron/due-soon` | `sekolahku-cron-secret-2026` |

---

## 4. Panduan Deploy ke Vercel

1. **Push Repository ke GitHub / GitLab:**
   Pastikan seluruh commit tersimpan di remote repository.
2. **Import Project ke Vercel:**
   Pilih Framework Preset: **Next.js**.
3. **Konfigurasi Environment Variables di Vercel Dashboard:**
   Masukkan seluruh variabel di atas ke menu **Project Settings > Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`: `https://<DOMAIN_PRODUKSI>.vercel.app`
   - `DEMO_MODE`: `true` (untuk sesi demo penguji) atau `false`
   - `DEMO_PASSWORD`: `<password_demo>`
   - `CRON_SECRET`: `<cron_secret_acak>`
4. **Daftarkan Redirect URL ke Supabase:**
   Buka Supabase Dashboard → **Authentication** → **URL Configuration**:
   - Tambahkan URL callback: `https://<DOMAIN_PRODUKSI>.vercel.app/auth/callback`
5. **Daftarkan Redirect URI ke Google Cloud Console:**
   Buka Google Cloud Console → Credentials:
   - Tambahkan URL Supabase: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
6. **Vercel Cron:**
   File `vercel.json` akan otomatis mengaktifkan endpoint `/api/cron/due-soon` setiap 1 jam (`0 * * * *`).

---

## 5. Daftar Pengujian yang Lulus

Total **36 Unit & Integration Tests** telah lolos pengujian:
1. `src/lib/dates.test.ts` (4 tests) - Logika zona waktu WIB (Asia/Jakarta, UTC+7) dan batas pergantian hari.
2. `src/lib/auth/roles.test.ts` (2 tests) - Pemetaan rute portal beranda berdasarkan peran pengguna.
3. `src/lib/supabase.test.ts` (2 tests) - Validasi format konfigurasi environment variable dengan Zod.
4. `src/lib/email.test.ts` (8 tests) - Validasi Gmail, deteksi typo umum, saran koreksi, dan normalisasi titik/tag.
5. `src/lib/admin/createProfile.test.ts` (7 tests) - Pendaftaran akun baru, proteksi role admin, dan validasi HP Indonesia.
6. `src/lib/storage.test.ts` (7 tests) - Sanitasi path traversal (`../../`), pemblokiran ekstensi `.exe`, dan batas 5MB.
7. `src/lib/whatsapp.test.ts` (6 tests) - Normalisasi nomor telepon 628, pembentuk URL `wa.me`, emoji, dan template chat.
8. `tests/rls.test.ts` (11 tests) - Verifikasi matriks privasi lintas peran di level database.
9. `tests/automation.test.ts` (6 tests) - Verifikasi trigger absensi, izin kerja, tugas baru, dan pengingat deadline.
10. `tests/dashboard.test.ts` (5 tests) - Verifikasi agregasi dashboard murid, guru, ortu, admin, dan roster kelas.
