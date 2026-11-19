# Catatan Keamanan Web & Arsitektur Proteksi "Sekolahku" (Tahap F7)

Dokumen ini mendokumentasikan lapisan pertahanan keamanan web (defense-in-depth) yang diterapkan pada aplikasi Sekolahku, mencakup HTTP Security Headers, proteksi rahasia server, pembatasan laju request (rate limiting), otorisasi role di level server, serta audit ketergantungan paket.

---

## 1. HTTP Security Headers & Content-Security-Policy (CSP)

Dikonfigurasi secara terpusat pada file `next.config.ts` untuk seluruh rute aplikasi:

| Header Keamanan | Nilai / Kebijakan | Tujuan & Fungsi Proteksi |
| :--- | :--- | :--- |
| **Content-Security-Policy (CSP)** | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com; frame-ancestors 'none'; form-action 'self' https://accounts.google.com; base-uri 'self';` | Membatasi sumber skrip, aset, dan koneksi API. Mengizinkan Supabase REST, Auth, Realtime WebSocket (`wss://`), Supabase Storage, dan Google OAuth tanpa melonggarkan keamanan terhadap serangan Cross-Site Scripting (XSS). |
| **X-Frame-Options** | `DENY` | Mencegah aplikasi dimuat di dalam `<iframe>` di situs luar untuk menangkal serangan Clickjacking. |
| **X-Content-Type-Options** | `nosniff` | Mencegah browser menebak (*MIME-type sniffing*) tipe file selain yang dideklarasikan server. |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Melindungi privasi URL pengguna saat berpindah ke tautan eksternal. |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | Mematikan akses perangkat keras yang tidak dibutuhkan aplikasi sekolah (kamera, mic, lokasi fisik). |
| **X-DNS-Prefetch-Control**| `on` | Mengoptimalkan resolusi DNS untuk domain terdaftar. |

---

## 2. Proteksi Kunci Rahasia Server (Zero-Leakage)

1. **Pemeriksaan Bundle Klien**:
   - Pencarian otomatis regex pada seluruh bundle statis hasil build produksi (`.next/static/**/*.js`) membuktikan string `SUPABASE_SERVICE_ROLE_KEY` **0% muncul / tidak ada sama sekali**.
   - Variabel rahasia (`SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD`, `CRON_SECRET`) hanya diimpor dalam modul yang bertanda `server-only` atau fungsi `createServerClient`.
2. **Tanpa Prefiks `NEXT_PUBLIC_` pada Kunci Sensitif**:
   - Seluruh variabel privat di `.env` terjaga tanpa prefiks `NEXT_PUBLIC_`, sehingga Webpack tidak mengeksposnya ke JavaScript browser.
3. **Pembersihan Log Konsol**:
   - Tidak ada `console.log` yang membocorkan token JWT, password, atau nomor telepon pribadi siswa/wali murid ke console browser.

---

## 3. Pembatasan Laju Request (Rate Limiting) & Endpoint Publik

1. **Endpoint `/api/demo-login`**:
   - Dilindungi helper in-memory sliding window `checkRateLimit` di `src/lib/rateLimit.ts`.
   - Dibatasi maksimal **15 percobaan per menit per alamat IP**. Jika melebihi, server merespons HTTP `429 Too Many Requests`.
2. **Endpoint `/api/cron/due-soon`**:
   - Wajib menyertakan header otorisasi rahasia: `Authorization: Bearer <CRON_SECRET>`. Jika tidak cocok, langsung ditolak dengan HTTP `401 Unauthorized`.
   - Dibatasi maksimal **10 pemanggilan per menit** untuk mencegah pemborosan resource database.
3. **Catatan Arsitektur Serverless**:
   - Pendekatan in-memory map efektif untuk melindungi instance runtime serverless dari spam beruntun (burst attacks). Untuk skala enterprise ribuan instans terdistribusi, mitigasi tingkat edge (seperti Vercel WAF atau Upstash Redis) dapat ditambahkan tanpa mengubah kontrak API.

---

## 4. Guarding Fitur Evaluasi / Demo (`DEMO_MODE`)

1. **Aturan Wajib 404**:
   - Jika variabel `DEMO_MODE` pada server tidak bernilai `"true"`, maka rute `/demo` dan endpoint `/api/demo-login` **WAJIB menghasilkan respons HTTP 404 (Not Found)**.
2. **Bukti Pengujian Otomatis**:
   - Diuji dalam suite `src/lib/security.test.ts`:
     - Test: *"mengembalikan status 404 pada endpoint /api/demo-login saat DEMO_MODE = 'false'"* &rarr; **LULUS**.
     - Test: *"mengembalikan status 404 pada endpoint /api/demo-login saat DEMO_MODE tidak diset (undefined)"* &rarr; **LULUS**.

---

## 5. Otorisasi Server Action & Row Level Security (RLS)

Keamanan Sekolahku mengadopsi prinsip **Zero-Trust**: antarmuka klien hanyalah representasi visual, sedangkan seluruh otorisasi hak cipta ditegakkan di sisi server database:

1. **Verifikasi Identitas & Role di Server Action**:
   - Seluruh fungsi di `src/lib/actions/*` memverifikasi sesi login via `supabase.auth.getUser()`, kemudian mengambil data peran dari tabel `profiles` via `auth.uid()`, **bukan dari metadata klien atau query parameter**.
   - Contoh Guarding:
     - Admin: Dilarang menonaktifkan diri sendiri dan dilarang menonaktifkan admin terakhir di sistem.
     - Guru: Hanya dapat menginput absensi dan membuat tugas pada kelas yang ditugaskan (`teachings`).
     - Wali Murid: Hanya dapat mengajukan izin untuk anak yang sah terhubung di `parent_students`.
     - Pesan: Wali murid tidak dapat membaca pesan antara guru dan murid (privasi terisolasi di level RLS).
2. **Row Level Security (RLS)**:
   - RLS aktif di **seluruh tabel schema public** (`attendance`, `assignments`, `submissions`, `threads`, `messages`, `announcements`, dll.).
   - Tidak ada peran `anon` yang memiliki izin baca atau tulis ke tabel manapun.

---

## 6. Audit Dependensi Paket (`npm audit`)

- **Status Dependensi**:
  - Seluruh modul inti (`next@16.4.6`, `react@19.3.0`, `@supabase/supabase-js`, `zod`, `tailwind`) menggunakan versi rilis terbaru yang stabil.
  - Audit paket terverifikasi bersih dari kerentanan kategori *Critical* atau *High* yang memengaruhi runtime produksi.
