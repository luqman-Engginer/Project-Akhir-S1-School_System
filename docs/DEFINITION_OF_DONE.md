# Definition of Done (Kriteria Selesai) - Sekolahku

Dokumen ini memetakan kriteria selesai proyek sesuai **PRD Bagian 15** serta evaluasi pemenuhan bukti teknis dan daftar rencana pengembangan lanjutan untuk bahan laporan tugas akhir.

---

## 1. Evaluasi Kriteria Selesai PRD Bagian 15

| No | Kriteria PRD Bagian 15 | Status | Bukti Implementasi & Pengujian |
| :-: | :--- | :---: | :--- |
| **1** | **Keempat peran bisa login dan melihat beranda masing-masing** | **LULUS** | - Login resmi via Google OAuth & login instan via `/demo` (`DemoButtons.tsx`).<br>- Beranda Admin (`/admin`), Guru (`/guru`), Murid (`/murid`), dan Orang Tua (`/ortu`) memuat data real-time dari RPC database dengan hak akses RLS masing-masing.<br>- Diuji lewat suite unit test `roles.test.ts` dan Next.js middleware router guard. |
| **2** | **Skenario demo di bagian 9 berjalan tanpa error** | **LULUS** | - 7 alur demo PRD (Guru absen &rarr; Notif ortu &rarr; Ortu kirim izin sakit &rarr; Guru setujui &rarr; Guru rilis tugas &rarr; Murid kumpul &rarr; Guru nilai &rarr; Admin pantau dashboard) berjalan mulus tanpa error.<br>- Terdokumentasi lengkap langkah per langkah di [docs/DEMO_SCRIPT.md](file:///d:/Project%20Akhir%20S1%20School_System/docs/DEMO_SCRIPT.md). |
| **3** | **Aturan privasi di bagian 6 teruji (ortu tidak bisa membuka pesan murid-guru)** | **LULUS** | - Diatur ketat di tingkat PostgreSQL Row Level Security (RLS) pada migration `0005_rls.sql` dan `0003_communication.sql`.<br>- Ortu tidak dapat melihat baris pesan antara guru-murid (`can_access_thread()` menolak akses).<br>- Admin sama sekali tidak memiliki akses baca/tulis ke tabel percakapan.<br>- Diuji otomatis dalam suite `tests/rls.test.ts`. |
| **4** | **Tampil baik di layar 360px, 768px, dan 1280px** | **LULUS** | - Seluruh rute diaudit pada lebar 360px (mobile compact), 768px (tablet), dan 1280px (desktop monitor).<br>- Tidak ada scroll horizontal liar (`overflow-x`).<br>- Tap target minimal 44px di perangkat sentuh.<br>- Skor Aksesibilitas Lighthouse mencapai **96 - 100**, CLS < 0.02. Terdokumentasi di [docs/UI_AUDIT.md](file:///d:/Project%20Akhir%20S1%20School_System/docs/UI_AUDIT.md). |
| **5** | **Link Vercel aktif dan bisa dibuka dari perangkat lain** | **LULUS** | - Konfigurasi `vercel.json` disiapkan dengan daily cron job (paket Hobby).<br>- Security Headers (CSP, nosniff, frame-ancestors 'none') aktif.<br>- Build produksi (`npm run build`) 100% lulus untuk 40 rute.<br>- Dilengkapi skrip otomatis `npm run smoke` untuk verifikasi respons HTTP server pasca-deploy. |

---

## 2. Rencana Pengembangan Lanjutan (Bahan Bab 5 / Saran Laporan Skripsi)

Fitur-fitur berikut sengaja dibatasi pada rilis v1.0 agar sistem tetap fokus, ringan, dan mudah diadopsi oleh SMK. Fitur ini sangat ideal dijadikan rekomendasi saran pengembangan pada bab penutup laporan:

1. **Integrasi WhatsApp Gateway Otomatis (Full Automation)**
   - *Kondisi saat ini*: Menggunakan skema Click-to-Chat `https://wa.me/?text=...` tanpa biaya langganan API pihak ketiga.
   - *Pengembangan*: Menghubungkan webhook backend dengan gateway WhatsApp resmi (misal: WhatsApp Cloud API, Twilio, atau Fonnte) agar pesan absensi darurat dan rekap nilai otomatis terkirim ke nomor HP orang tua tanpa perlu tindakan manual guru.

2. **Pengaturan Jam Tenang Notifikasi (Quiet Hours)**
   - *Kondisi saat ini*: Notifikasi terkirim seketika saat event absensi/tugas terjadi.
   - *Pengembangan*: Menyediakan preferensi pengguna untuk menunda (*snooze*) notifikasi akademik non-darurat pada malam hari (20.00 - 06.00 WIB) dan mengirimkan rekap pagi harinya agar tidak mengganggu istirahat guru dan wali murid.

3. **Impor Data Master via Spreadsheet (Batch CSV / Excel Upload)**
   - *Kondisi saat ini*: Admin menambah murid dan kelas melalui antarmuka web interaktif satu per satu.
   - *Pengembangan*: Fitur unggah file Excel/CSV format Dapodik (*Data Pokok Pendidikan*) untuk mendaftarkan ratusan siswa baru sekaligus dalam hitungan detik di awal tahun ajaran.

4. **Ekspor Rapor Digital & Cetak PDF Kurikulum Merdeka**
   - *Kondisi saat ini*: Rekapitulasi nilai dan kehadiran dapat dipantau langsung secara real-time di layar.
   - *Pengembangan*: Generator PDF otomatis untuk mencetak Lembar Laporan Capaian Kompetensi (Rapor Siswa) berstandar Kurikulum Merdeka lengkap dengan tanda tangan digital wali kelas dan kepala sekolah.

5. **Modul Administrasi Keuangan (SPP & Iuran Sekolah)**
   - *Kondisi saat ini*: Sistem murni berfokus pada pilar akademik dan komunikasi harian.
   - *Pengembangan*: Pencatatan tagihan SPP, notifikasi jatuh tempo pembayaran via web & WhatsApp, serta integrasi payment gateway (Midtrans / Xendit / QRIS) untuk mempermudah wali murid membayar iuran sekolah secara online.
