import { describe, it, expect } from 'vitest'
import { normalizeIdPhone, buildWaLink, waTemplates } from './whatsapp'

describe('WhatsApp Helper Unit Tests', () => {
  describe('normalizeIdPhone', () => {
    it('menormalisasi berbagai format nomor HP Indonesia yang sah ke 628xxxxxxxx', () => {
      expect(normalizeIdPhone('0812-3456-7890')).toBe('6281234567890')
      expect(normalizeIdPhone('+62 812 3456 7890')).toBe('6281234567890')
      expect(normalizeIdPhone('6281234567890')).toBe('6281234567890')
      expect(normalizeIdPhone('81234567890')).toBe('6281234567890')
      expect(normalizeIdPhone('0852.1122.3344')).toBe('6285211223344')
    })

    it('menolak nomor telepon yang bukan format Indonesia atau bukan nomor HP (bukan 08)', () => {
      expect(normalizeIdPhone('021-1234567')).toBeNull() // Telepon rumah Jakarta
      expect(normalizeIdPhone('+1 415 555 2671')).toBeNull() // Nomor AS
      expect(normalizeIdPhone('08123')).toBeNull() // Terlalu pendek
      expect(normalizeIdPhone('08123456789012345')).toBeNull() // Terlalu panjang
      expect(normalizeIdPhone('')).toBeNull()
      expect(normalizeIdPhone(null)).toBeNull()
      expect(normalizeIdPhone('bukan-nomor')).toBeNull()
    })
  })

  describe('buildWaLink & Templates', () => {
    it('membentuk link wa.me valid dengan pesan terenkode aman', () => {
      const link = buildWaLink('081234567890', 'Halo guru, selamat pagi!')
      expect(link).toBe('https://wa.me/6281234567890?text=Halo%20guru%2C%20selamat%20pagi!')
    })

    it('mengembalikan null jika nomor telepon tidak valid', () => {
      const link = buildWaLink('nomor-salah', 'Pesan')
      expect(link).toBeNull()
    })

    it('menangani teks dengan karakter khusus, baris baru, dan emoji', () => {
      const templateText = waTemplates.reminder('Raka', 'Kuis Pemrograman Web')
      const link = buildWaLink('+62 812-3456-7890', templateText)

      expect(link).not.toBeNull()
      expect(link).toContain('https://wa.me/6281234567890?text=')
      // Harus memuat encode dari nama dan emoji
      expect(link).toContain('Raka')
      expect(link).toContain('%F0%9F%92%AA') // Emoji 💪
    })

    it('menghasilkan pesan template kehadiran dan pengumuman dengan benar', () => {
      const absentMsg = waTemplates.absent('Nadia', '20/11/2026')
      expect(absentMsg).toContain('Nadia')
      expect(absentMsg).toContain('20/11/2026')

      const announcementMsg = waTemplates.announcement('Jadwal UAS Semester Ganjil')
      expect(announcementMsg).toContain('Jadwal UAS Semester Ganjil')
    })
  })
})
