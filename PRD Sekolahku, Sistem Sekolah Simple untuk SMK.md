# PRD: Sekolahku, Sistem Sekolah Simple untuk SMK

Project akhir | Versi 1.0 | Nama aplikasi masih sementara, boleh diganti

## 1. Ringkasan

Sekolahku adalah aplikasi web responsif yang menghubungkan **guru, murid, orang tua, dan admin** dalam satu tempat. Fokusnya bukan banyak fitur, tapi **gampang dipakai semua generasi**: tombol besar, bahasa sehari-hari, dan tiap orang cuma ngelihat hal yang relevan buat dia.

**Masalah yang diselesaikan**

- Info sekolah tenggelam di grup WhatsApp yang rame.
- Ortu telat tahu anaknya absen, nilai turun, atau ada tugas telat.
- Guru repot mengumpulkan tugas, absen, dan nilai di banyak tempat.
- Komunikasi guru dan ortu gak terstruktur, kadang masuk jam 11 malam.

**Tujuan**

1. Semua arah komunikasi (guru↔murid, guru↔ortu, ortu↔murid) tersedia dalam satu aplikasi.
2. Kerjaan guru berkurang, bukan nambah: absen maksimal 1 menit per kelas.
3. Bisa dibuka di HP, tablet, maupun laptop tanpa install.
4. Siap di-deploy ke Vercel dan dikasih link untuk penilaian.

**Indikator sukses (untuk demo)**

- Satu alur lengkap jalan tanpa error: guru absen murid, ortu langsung dapat notifikasi, ortu kirim pesan izin, guru balas.
- Semua peran bisa login dan menyelesaikan tugas utamanya dalam 3 klik.
- Tampilan nyaman di layar HP 360px sampai desktop.

## 2. Prinsip Desain

1. **Simple dulu.** Maksimal 4 menu per peran.
2. **Satu layar, satu tujuan.**
3. **Semua generasi.** Font minimal 16px, area tap minimal 44px, kontras tinggi, istilah teknis dihindari.
4. **Notifikasi seperlunya.** Tidak ada spam.
5. **Privasi anak itu penting.** Akses dibatasi per peran.

## 3. Peran Pengguna

| Peran | Siapa | Tugas utama | Hak akses |
| --- | --- | --- | --- |
| Admin | Tata usaha / pengelola | Melihat data dan hasil, mengelola akun dan kelas | Lihat semua data (read-only), kelola akun, kelas, mapel |
| Guru | Guru mapel, bisa juga wali kelas | Absen, tugas, nilai, materi, pengumuman, balas pesan | Hanya kelas dan mapel yang diajar |
| Murid | Siswa SMK | Lihat jadwal, kumpul tugas, lihat nilai, tanya guru | Hanya data diri sendiri |
| Orang tua | Wali murid | Pantau anak, izin, hubungi guru | Hanya data anak yang tertaut |

Catatan: Admin sengaja dibuat **cuma pemantau**. Dashboard-nya isinya angka dan grafik, tidak ada form rumit.

## 4. Struktur Menu (Maks. 4 per Peran)

- **Murid:** Beranda, Tugas, Jadwal & Nilai, Pesan
- **Guru:** Beranda, Kelas (absen, tugas, nilai, materi), Pesan, Pengumuman
- **Orang tua:** Beranda (ringkasan anak), Perkembangan (absen, nilai, tugas), Pesan, Pengumuman
- **Admin:** Dashboard, Pengguna, Kelas & Mapel, Pengumuman

Di HP, menu muncul sebagai **bottom navigation**. Di desktop, jadi sidebar sempit di kiri.

## 5. Fitur MVP

### 5.1 Login dengan Gmail

- Login memakai **Google Sign-In** (tanpa password, tanpa lupa password).
- Akun dibuat/didaftarkan oleh admin. Email yang belum didaftarkan tidak bisa masuk dan melihat pesan ramah: "Email kamu belum terdaftar, hubungi admin sekolah."
- Setelah login, sistem membaca peran dan langsung mengarahkan ke beranda yang sesuai.

**Validasi email (supaya aman dari bug seperti `luqman@smk`)**

- Wajib berakhiran `@gmail.com`. Alasan: login Google, jadi harus akun Gmail asli.
- Normalisasi: huruf kecil semua, buang spasi di awal/akhir.
- Tolak salah ketik umum: `@gmial.com`, `@gmail.co`, `@gmail.con`, `@gmai.com`, `@gmail` tanpa domain. Tampilkan saran: "Maksud kamu luqman@gmail.com?"
- Cegah duplikat akibat trik Gmail: titik diabaikan dan `+tag` diabaikan, jadi `l.uqman+a@gmail.com` dianggap sama dengan `luqman@gmail.com`.
- Validasi dilakukan di **dua tempat**: form (UX) dan server (keamanan).

**Mode Demo (penting untuk penilaian)**

- Penguji biasanya tidak punya akun yang terdaftar. Sediakan halaman "Coba sebagai..." dengan 4 tombol (Admin, Guru, Murid, Orang tua) yang login ke akun dummy.
- Dikontrol lewat environment variable, jadi bisa dimatikan kalau dipakai sungguhan.

### 5.2 Beranda per peran (dashboard)

Ini **wow factor** proyek: satu layar yang langsung menjawab "hari ini ada apa?".

- **Murid:** tugas yang deadline-nya dekat, jadwal hari ini, nilai terbaru, pesan belum dibaca.
- **Guru:** kelas hari ini, tombol cepat "Absen sekarang", tugas yang perlu dinilai, pesan belum dibalas.
- **Orang tua:** kartu anak (nama, kelas), status kehadiran hari ini (hadir/izin/sakit/alpa), tugas telat, nilai terbaru, pengumuman.
- **Admin:** jumlah pengguna, persentase kehadiran hari ini dan 7 hari terakhir, rata-rata nilai per kelas, daftar murid dengan absen tinggi, pengumuman terbaru. Semua read-only, hanya grafik dan angka.

### 5.3 Pengumuman

- Guru/admin membuat pengumuman untuk: semua, satu kelas, atau hanya orang tua.
- Ada tanda "sudah dibaca" supaya penulis tahu yang belum lihat.
- Pengumuman penting bisa disematkan di atas.

### 5.4 Absensi

- Guru memilih kelas dan tanggal. Semua murid default **Hadir**, guru cukup mengubah yang tidak hadir (Sakit, Izin, Alpa). Itu bikin absen cepat.
- Otomatis memicu notifikasi ke orang tua kalau anak **tidak hadir**.
- Orang tua bisa mengajukan **izin** dari aplikasi. Guru tinggal setujui, dan status absen langsung ter-update.

### 5.5 Tugas dan Nilai

- Guru membuat tugas: judul, deskripsi, deadline, lampiran opsional.
- Murid mengumpulkan lewat upload file atau link (Google Drive, GitHub, dll., cocok untuk anak SMK).
- Guru memberi nilai dan komentar. Murid dan orang tua langsung melihat hasilnya.
- Status tugas jelas dan berwarna: Belum dikerjakan, Sudah dikumpulkan, Dinilai, Terlambat.

### 5.6 Jadwal

- Jadwal mingguan per kelas, tampil sebagai daftar hari ini di beranda dan tabel mingguan di menu Jadwal.
- Diisi oleh admin (data kecil, cukup form sederhana).

### 5.7 Pesan (dua mode)

Sesuai pilihan: **pesan terstruktur dan chat**, dibuat jadi satu fitur supaya tidak membingungkan.

- Setiap percakapan adalah **thread** dengan **kategori**: Izin, Konsultasi, Tugas/Nilai, Lainnya.
- Di dalam thread, orang bisa **saling balas seperti chat** (real-time).
- Thread punya status: Baru, Dibaca, Dibalas, Selesai.
- Jalur yang diizinkan:
  - Ortu ↔ Guru
  - Murid ↔ Guru
  - Ortu → Murid: "Pengingat" singkat (misal "jangan lupa tugas RPL ya"). Masuk sebagai notifikasi ke murid.
- **Jam tenang guru:** pesan tetap bisa dikirim kapan saja, tapi notifikasi ke guru ditunda ke jam kerja (default 07.00–17.00).

### 5.8 Notifikasi

- **Di web:** ikon lonceng dengan angka, dan daftar notifikasi. Real-time lewat Supabase Realtime.
- **WhatsApp:** pesan terkirim ke nomor HP wali murid untuk kejadian penting saja (anak tidak hadir, pesan baru dari guru, pengumuman penting).
  - Tahap 1 (pasti jadi): tombol **"Kirim via WhatsApp"** yang membuka WhatsApp dengan teks siap kirim (`wa.me`), gratis dan tanpa API.
  - Tahap 2 (bonus): kirim otomatis lewat layanan gateway WhatsApp pihak ketiga. Biayanya dan aturannya beda-beda tiap penyedia, jadi dicek dulu sebelum dipakai.
- Aturan sederhana: kalau pengguna sedang di website, pakai notifikasi web. WA hanya untuk yang butuh sampai di luar aplikasi.

## 6. Privasi dan Keamanan

| Data | Admin | Guru | Murid | Ortu |
| --- | --- | --- | --- | --- |
| Data diri sendiri | Lihat | Lihat | Lihat | Lihat |
| Absensi & nilai murid | Lihat semua | Kelas yang diajar | Diri sendiri | Anak sendiri |
| Pesan guru↔murid | Tidak | Peserta thread | Peserta thread | **Tidak** |
| Pesan guru↔ortu | Tidak | Peserta thread | Tidak | Peserta thread |
| Kelola akun | Ya | Tidak | Tidak | Tidak |

- Aturan akses dipaksa di **database (Row Level Security Supabase)**, bukan cuma disembunyikan di tampilan.
- File upload dibatasi tipe dan ukuran (misal maks 5 MB).
- Tidak ada data sensitif di URL. Semua halaman butuh login, kecuali halaman login dan demo.

## 7. Tech Stack (Mudah di-deploy ke Vercel)

- **Framework:** Next.js (App Router) + JavaScript/TypeScript
- **UI:** Tailwind CSS + komponen sederhana buatan sendiri
- **Database, Auth, Storage, Realtime:** Supabase (PostgreSQL), gratis untuk skala tugas
- **Login:** Google OAuth lewat Supabase Auth
- **Grafik:** Recharts
- **Hosting:** Vercel (link untuk dikumpulkan)
- **Notifikasi WhatsApp:** `wa.me` (tahap 1), gateway pihak ketiga (bonus)

Alasan: semua serba JavaScript, satu repo, setiap push ke GitHub otomatis ter-deploy di Vercel, dan Supabase menangani login, database, dan real-time sekaligus tanpa perlu bikin server sendiri.

## 8. Arah Tampilan (UI)

Tujuannya: **hangat, rapi, indah, tapi tidak terlihat seperti template AI.**

**Hindari**

- Gradasi ungu-biru, efek kaca (glassmorphism), glow neon.
- Grid kartu seragam yang semuanya sama besar dengan ikon bulat di atas.
- Emoji di judul, hero section generik, dan teks bahasa Inggris campur aduk.

**Pakai**

- **Warna:** latar putih gading hangat (sekitar `#FAF7F2`), teks arang tua (`#1F2A2E`), warna utama hijau tua (`#1F5C4D`), aksen terakota (`#C8643B`) untuk hal yang perlu perhatian. Status: hijau (hadir/selesai), kuning (menunggu), merah bata (telat/alpa).
- **Font:** judul Bricolage Grotesque, isi Figtree. Keduanya terbaca jelas dan punya karakter.
- **Bentuk:** sudut membulat sedang (8–12px), bayangan tipis, banyak ruang kosong.
- **Tata letak:** daftar dan baris yang jelas, bukan kartu di mana-mana. Satu elemen utama yang menonjol per layar.
- **Bahasa:** sehari-hari dan sopan: "Tugas kamu hari ini", bukan "Assignment Dashboard".
- **Ilustrasi kosong (empty state)** dengan kalimat ramah, misalnya "Belum ada tugas, santai dulu."
- **Aksesibilitas:** font minimal 16px, tombol minimal 44px, jangan mengandalkan warna saja (status selalu ada teks), ada opsi ukuran teks besar untuk orang tua.
- **Responsif:** desain mulai dari HP (360px), lalu tablet dan desktop.

## 9. Alur Utama (Skenario Demo)

1. **Guru** masuk, buka Kelas XI RPL 1, absen: Raka ditandai Sakit.
2. **Ortu Raka** langsung dapat notifikasi "Raka tercatat sakit hari ini" (di web, plus tombol WA).
3. Ortu membuka pesan, memilih kategori Izin, mengirim surat dokter singkat.
4. **Guru** menerima pesan di beranda, membalas, lalu menandai selesai.
5. Guru membuat tugas baru. **Murid** melihatnya di beranda, mengumpulkan link.
6. Guru memberi nilai. **Murid dan ortu** melihat nilai masuk.
7. **Admin** membuka dashboard dan melihat kehadiran serta rata-rata nilai ter-update.

## 10. Struktur Data (Kasar)

- **profiles**: id, email, nama, peran (admin/guru/murid/ortu), nomor\_hp, aktif
- **kelas**: id, nama, tahun\_ajaran, wali\_kelas\_id
- **mapel**: id, nama
- **murid\_kelas**: murid\_id, kelas\_id
- **ortu\_murid**: ortu\_id, murid\_id
- **pengajaran**: id, guru\_id, mapel\_id, kelas\_id
- **jadwal**: id, pengajaran\_id, hari, jam\_mulai, jam\_selesai
- **absensi**: id, murid\_id, kelas\_id, tanggal, status, catatan, dicatat\_oleh
- **izin**: id, murid\_id, diajukan\_oleh, tanggal, alasan, lampiran, status
- **tugas**: id, pengajaran\_id, judul, deskripsi, deadline, lampiran
- **pengumpulan**: id, tugas\_id, murid\_id, file\_atau\_link, waktu\_kumpul, nilai, komentar
- **pengumuman**: id, pembuat\_id, target (semua/kelas/ortu), kelas\_id, judul, isi, disematkan
- **pengumuman\_dibaca**: pengumuman\_id, user\_id, waktu
- **thread**: id, kategori, status, murid\_id (opsional), dibuat\_oleh
- **thread\_peserta**: thread\_id, user\_id
- **pesan**: id, thread\_id, pengirim\_id, isi, waktu, dibaca
- **notifikasi**: id, user\_id, tipe, judul, isi, tautan, dibaca, waktu

## 11. Data Dummy (Di Bawah 10 Akun)

| # | Peran | Nama | Keterangan |
| --- | --- | --- | --- |
| 1 | Admin | Bu Sari | Tata usaha |
| 2 | Guru | Pak Dedi | Wali kelas XI RPL 1, mapel Pemrograman Web |
| 3 | Guru | Bu Lina | Mapel Basis Data |
| 4 | Murid | Raka | XI RPL 1 |
| 5 | Murid | Nadia | XI RPL 1 |
| 6 | Murid | Bima | XI RPL 1 |
| 7 | Ortu | Pak Hendra | Orang tua Raka |
| 8 | Ortu | Bu Wati | Orang tua Nadia dan Bima (kakak-adik, untuk uji multi-anak) |

Total 8 akun. Data pendukung: 1 kelas, 2 mapel, jadwal 1 minggu, 3 tugas (campuran selesai/belum/telat), absensi 5 hari terakhir, 2 pengumuman, 2 thread pesan.

Catatan: untuk login Google sungguhan, email dummy harus akun Gmail asli. Itu sebabnya **Mode Demo** di bagian 5.1 penting.

## 12. Daftar Risiko dan Bug yang Diantisipasi

- Email salah ketik atau bukan Gmail (ditangani di bagian 5.1).
- Satu orang tua punya banyak anak: beranda harus bisa ganti anak dengan satu ketukan.
- Satu guru mengajar banyak kelas: pilih kelas dulu sebelum absen.
- Absen dobel pada hari dan kelas yang sama: gunakan update, bukan insert baru.
- Zona waktu: gunakan WIB konsisten di server dan tampilan.
- Deadline tugas lewat saat murid sedang upload: tentukan aturan jelas (tetap diterima, ditandai Terlambat).
- Upload file besar atau tipe berbahaya: batasi ukuran dan tipe.
- Environment variable lupa dipasang di Vercel: siapkan daftar `.env` dan cek sebelum deploy.
- Redirect URL Google OAuth belum diset untuk domain Vercel: set di Google Cloud dan Supabase.

## 13. Di Luar Cakupan (Tidak Dibuat Dulu)

Pembayaran SPP, rapor resmi dan integrasi Dapodik, aplikasi mobile native, video call, AI, mode offline penuh, multi-sekolah.

## 14. Rencana Pengerjaan

Asumsi waktu sekitar 4 minggu (bisa dipadatkan atau dilonggarkan).

**Minggu 1: Fondasi**

- Setup repo, Next.js, Tailwind, Supabase, deploy kosong ke Vercel sejak hari pertama
- Skema database dan Row Level Security
- Login Google, validasi email, redirect per peran, Mode Demo
- Layout dasar: bottom nav (HP) dan sidebar (desktop), design token

**Minggu 2: Fitur inti**

- Admin: kelola pengguna, kelas, mapel, jadwal
- Absensi dan izin
- Tugas, pengumpulan, dan penilaian

**Minggu 3: Komunikasi dan dashboard**

- Pengumuman
- Pesan (thread, kategori, balasan real-time)
- Notifikasi web, tombol WhatsApp
- Dashboard 4 peran (tahap pertama: angka, lalu grafik)

**Minggu 4: Rapikan**

- Polish UI, empty state, loading, pesan error ramah
- Uji di HP asli dan beberapa ukuran layar
- Seed data dummy, uji skenario demo dari awal sampai akhir
- Bonus jika sempat: WhatsApp otomatis, jam tenang guru, mode teks besar
- Siapkan laporan dan presentasi

## 15. Kriteria Selesai (Definition of Done)

- Keempat peran bisa login dan melihat beranda masing-masing.
- Skenario demo di bagian 9 berjalan tanpa error.
- Aturan privasi di bagian 6 teruji (ortu tidak bisa membuka pesan murid-guru).
- Tampil baik di layar 360px, 768px, dan 1280px.
- Link Vercel aktif dan bisa dibuka dari perangkat lain.

## 16. Hal yang Masih Perlu Dikonfirmasi

1. Nama aplikasi final.
2. Deadline pengumpulan dan apakah dikerjakan sendiri atau kelompok (mempengaruhi pembagian tugas).
3. Apakah dosen/guru mewajibkan format laporan atau fitur tertentu.
4. Mau pakai TypeScript atau JavaScript biasa.
