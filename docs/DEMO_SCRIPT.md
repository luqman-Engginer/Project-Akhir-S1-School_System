# Panduan Skenario Demo 7 Langkah Sekolahku

Dokumen ini disusun sebagai panduan resmi presentasi dan pengujian alur kerja aplikasi **Sekolahku** dari awal hingga akhir, mengikuti alur skenario PRD (Bagian 14 & 15).

Akses halaman demo: `http://localhost:3000/demo` (atau URL Vercel produksi Anda).

---

## 8 Akun Resmi Demo (Password: `sekolahku-demo-2026`)

| No | Peran / Role | Nama Akun | Email Demo | Keterangan |
| :-: | :--- | :--- | :--- | :--- |
| 1 | **Admin** | Bu Sari (Admin) | `admin.sari@demo.sekolahku.test` | Pemantau akademik & pengelola data master |
| 2 | **Guru** | Pak Dedi (Wali Kelas) | `guru.dedi@demo.sekolahku.test` | Wali Kelas XI RPL 1 & Guru Pemrograman Web |
| 3 | **Guru** | Bu Lina | `guru.lina@demo.sekolahku.test` | Guru Basis Data |
| 4 | **Murid** | Raka | `murid.raka@demo.sekolahku.test` | Siswa XI RPL 1 (Anak Pak Hendra) |
| 5 | **Murid** | Nadia | `murid.nadia@demo.sekolahku.test` | Siswa XI RPL 1 (Anak Bu Wati) |
| 6 | **Murid** | Bima | `murid.bima@demo.sekolahku.test` | Siswa XI RPL 1 (Anak Bu Wati) |
| 7 | **Orang Tua** | Pak Hendra | `ortu.hendra@demo.sekolahku.test` | Wali murid dari Raka |
| 8 | **Orang Tua** | Bu Wati | `ortu.wati@demo.sekolahku.test` | Wali murid dari Nadia dan Bima |

---

## Skenario Demo Utama (7 Langkah Alur PRD)

```
[Langkah 1: Guru Absen] ──► [Langkah 2: Notifikasi Ortu] ──► [Langkah 3: Ortu Kirim Izin]
                                                                        │
[Langkah 6: Guru Nilai] ◄── [Langkah 5: Murid Kumpul]   ◄── [Langkah 4: Guru Setujui]
         │
         ▼
[Langkah 7: Admin Pantau Dashboard Real-time]
```

---

### Langkah 1: Guru Mengabsen Kelas (Selesai dalam 1 Menit)
- **Akun**: Masuk sebagai **Pak Dedi (Wali Kelas)** via `/demo`.
- **Aksi**:
  1. Dari Beranda Guru, klik tombol **"Absen Sekarang"** atau buka menu **Kelas &rarr; XI RPL 1 &rarr; Tab Absensi &rarr; Isi Absensi Hari Ini**.
  2. Perhatikan bahwa seluruh murid secara default sudah berstatus **Hadir**.
  3. Ubah status **Raka** menjadi **Sakit** dan berikan catatan singkat: *"Demam flu"*.
  4. Klik **"Simpan Absensi"**.
- **Hasil**: Muncul notifikasi sukses (*Toast*) berwarna hijau. Status absensi hari ini tersimpan di database.

---

### Langkah 2: Orang Tua Menerima Notifikasi Kehadiran Instan
- **Akun**: Buka jendela incognito / browser lain, masuk sebagai **Pak Hendra (Orang Tua Raka)** via `/demo`.
- **Aksi**:
  1. Amati lonceng notifikasi di pojok kanan atas yang menampilkan badge merah angka belum dibaca.
  2. Buka panel notifikasi: Terdapat notifikasi baru bertajuk *"Kehadiran Raka: Raka tercatat Sakit pada hari ini."*
  3. Di Beranda Orang Tua, status Raka hari ini langsung diperbarui menjadi **Sakit** dengan lencana kuning.

---

### Langkah 3: Orang Tua Mengajukan Surat Izin / Sakit
- **Akun**: Tetap sebagai **Pak Hendra**.
- **Aksi**:
  1. Klik menu **Izin &rarr; Ajukan Permohonan Izin**.
  2. Pilih jenis: **Sakit**, rentang tanggal: Hari ini sampai besok, alasan: *"Istirahat dokter 2 hari karena demam berdarah"*.
  3. Unggah file dummy surat dokter (`surat_dokter.pdf` atau `.png`).
  4. Klik **"Kirim Permohonan"**.
- **Hasil**: Permohonan masuk dengan status *Menunggu Verifikasi Guru*.

---

### Langkah 4: Guru Menyetujui Permohonan Izin
- **Akun**: Kembali ke layar **Pak Dedi (Guru)**.
- **Aksi**:
  1. Buka menu **Izin** (terlihat badge permohonan baru).
  2. Klik permohonan izin dari Pak Hendra untuk Raka.
  3. Periksa rincian alasan dan unduh/lihat lampiran surat dokter.
  4. Klik tombol hijau **"Setujui Permohonan"**.
- **Hasil**:
  - Status izin berubah menjadi *Disetujui*.
  - Catatan absensi Raka pada tanggal terkait otomatis diperbarui menjadi *Izin Sakit Terverifikasi*.

---

### Langkah 5: Guru Membuat Tugas Baru & Murid Mengumpulkan Tugas
- **Aksi Guru (Pak Dedi)**:
  1. Buka **Kelas XI RPL 1 &rarr; Tab Tugas &rarr; Buat Tugas Baru**.
  2. Judul: *"Membuat Tampilan Dashboard Responsive CSS"*, Mapel: *Pemrograman Web*, Batas Waktu: *Besok 23.59 WIB*.
  3. Klik **"Terbitkan Tugas"**.
- **Aksi Murid (Raka)**:
  1. Masuk sebagai **Raka (Murid)** via `/demo`.
  2. Di Beranda Murid, tugas baru langsung muncul di bagian atas bertanda *"Mendesak (< 24 Jam)"*.
  3. Buka tugas &rarr; klik **"Kumpulkan Jawaban"**.
  4. Tulis catatan: *"Tugas sudah selesai sesuai instruksi, lampiran file zip terlampir"* &rarr; pilih file &rarr; klik **"Kirim Tugas"**.
- **Hasil**: Status tugas berubah dari *Belum Dikerjakan* menjadi *Sudah Dikumpulkan* (Tepat Waktu).

---

### Langkah 6: Guru Memeriksa & Memberikan Nilai
- **Akun**: Kembali ke **Pak Dedi (Guru)**.
- **Aksi**:
  1. Buka tugas *"Membuat Tampilan Dashboard Responsive CSS"*.
  2. Klik nama siswa **Raka**.
  3. Unduh berkas tugas siswa, lalu pada form penilaian masukkan **Nilai: 95** dan catatan umpan balik: *"Struktur HTML sangat rapi, adaptasi mobile 360px sangat mulus. Pertahankan!"*.
  4. Klik **"Simpan Nilai"**.
- **Hasil**:
  - Murid menerima notifikasi nilai tugas.
  - Orang tua (Pak Hendra) di menu **Perkembangan Anak** langsung melihat nilai 95 pada mata pelajaran Pemrograman Web.

---

### Langkah 7: Admin Memantau Rekapitulasi Sekolah Secara Menyeluruh
- **Akun**: Masuk sebagai **Bu Sari (Admin)** via `/demo`.
- **Aksi**:
  1. Di Beranda Admin (`/admin`), lihat ringkasan eksekutif:
     - Jumlah Guru (2), Murid (3), Wali Murid (2).
     - Grafik tren kehadiran 7 hari otomatis memetakan persentase kehadiran kelas.
     - Grafik rata-rata nilai per kelas memperlihatkan performa akademik rombel XI RPL 1.
  2. Buka menu **Kelas & Mapel &rarr; Kelas XI RPL 1 &rarr; Ringkasan**:
     - Rekap akademik baca-saja (*read-only*) tampil bersih tanpa tombol manipulasi data.
     - Terlihat daftar murid dengan absensi tinggi dan persentase kehadiran 30 hari.

---

## Poin-Poin Istimewa yang Layak Dipamerkan Saat Ujian / Presentasi

1. **Privasi Tingkat Database (RLS)**:
   - Buktikan bahwa orang tua **tidak pernah bisa melihat chat antara guru dan murid**, dan admin **sama sekali tidak memiliki akses ke tabel percakapan pribadi**.
2. **Pencegahan Trik Duplikasi Email Gmail**:
   - Sistem menormalisasi titik dan suffix `+tag` (misal `budi.santoso+tugas@gmail.com` sama dengan `budisantoso@gmail.com`) sehingga tidak dapat disalahgunakan untuk membuat akun ganda.
3. **Pendeteksi Bentrok Jadwal KBM Otomatis**:
   - Guru tidak bisa dijadwalkan mengajar di dua kelas berbeda pada hari dan jam yang bertabrakan.
4. **Kecepatan Absensi 1 Menit**:
   - Guru tidak perlu mencentang satu per satu murid hadir; sistem menghemat 90% waktu administrasi guru di awal pelajaran.
5. **Mode Teks Besar Ramah Generasi**:
   - Fitur toggle font ramah kakek-nenek/orang tua tanpa merusak tata letak di smartphone kecil (360px).
