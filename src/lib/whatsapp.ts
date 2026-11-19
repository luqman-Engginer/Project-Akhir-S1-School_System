/**
 * Helper utilitas integrasi WhatsApp (normalisasi nomor Indonesia dan pembentuk tautan wa.me).
 */

/**
 * Menormalisasi nomor telepon Indonesia ke format internasional '628xxxxxxxx'.
 * Mendukung format: '0812-3456-7890', '+62 812 3456', '628123456789', '81234567890'.
 * Menolak nomor jika bukan nomor HP Indonesia valid (panjang total 11-14 digit diawali 628).
 * Mengembalikan null jika tidak valid.
 */
export function normalizeIdPhone(input: string | null | undefined): string | null {
  if (!input) return null

  // Bersihkan semua karakter selain angka
  let digits = input.replace(/\D/g, '')

  // Format lokal awalan 08 -> 628
  if (digits.startsWith('08')) {
    digits = '62' + digits.substring(1)
  }
  // Format tanpa awalan (misal 81234567890) -> 628
  else if (digits.startsWith('8')) {
    digits = '62' + digits
  }

  // Wajib diawali 628
  if (!digits.startsWith('628')) {
    return null
  }

  // Nomor ponsel Indonesia memiliki panjang total 11 sampai 14 digit
  if (digits.length < 11 || digits.length > 14) {
    return null
  }

  return digits
}

/**
 * Membentuk URL tautan WhatsApp (https://wa.me/...) dengan teks terenkode.
 * Mengembalikan null jika nomor telepon tidak valid.
 */
export function buildWaLink(phone: string | null | undefined, text: string): string | null {
  const normalized = normalizeIdPhone(phone)
  if (!normalized) return null

  const encodedText = encodeURIComponent(text.trim())
  return `https://wa.me/${normalized}?text=${encodedText}`
}

/**
 * Kumpulan template pesan WhatsApp siap pakai untuk sekolah.
 */
export const waTemplates = {
  absent: (studentName: string, date: string): string =>
    `Halo Bapak/Ibu wali murid, menginfokan bahwa ananda *${studentName}* tercatat tidak hadir pada tanggal *${date}*. Mohon konfirmasi surat izin atau kabar melalui aplikasi Sekolahku. Terima kasih.`,

  reminder: (studentName: string, taskTitle: string): string =>
    `Halo *${studentName}*, pengingat untuk tugas *"${taskTitle}"* yang akan segera berakhir. Pastikan tugas sudah dikumpulkan di aplikasi Sekolahku ya! Semangat! 💪`,

  announcement: (title: string): string =>
    `📢 *Pengumuman Baru Sekolahku*\n"${title}"\n\nSilakan buka aplikasi Sekolahku untuk membaca detail pengumuman selengkapnya.`,
}
