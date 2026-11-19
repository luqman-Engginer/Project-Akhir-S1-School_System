import { describe, it, expect, vi } from 'vitest'
import { sanitizeFileName, uploadAttachment, MAX_ATTACHMENT_SIZE_BYTES } from './storage'

describe('storage.ts Helper Unit Tests', () => {
  describe('sanitizeFileName', () => {
    it('membersihkan path traversal "../../x.pdf" menjadi "x.pdf"', () => {
      expect(sanitizeFileName('../../x.pdf')).toBe('x.pdf')
      expect(sanitizeFileName('..\\..\\tugas.pdf')).toBe('tugas.pdf')
    })

    it('mengganti spasi dengan tanda minus', () => {
      expect(sanitizeFileName('Tugas Akhir SMK RPL.pdf')).toBe('Tugas-Akhir-SMK-RPL.pdf')
    })

    it('menghilangkan karakter aneh atau berbahaya', () => {
      expect(sanitizeFileName('file*nama?!$<script>.png')).toBe('filenamascript.png')
    })

    it('memberikan fallback nama aman jika seluruh karakter dibuang', () => {
      expect(sanitizeFileName('???')).toBe('document')
    })
  })

  describe('uploadAttachment Validation', () => {
    it('menolak file yang melebihi batas ukuran 5 MB', async () => {
      // Buat mock file berukuran 6 MB
      const largeFile = new File(['a'.repeat(100)], 'large.pdf', {
        type: 'application/pdf',
      })
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 })

      const result = await uploadAttachment('submission', '123e4567-e89b-12d3-a456-426614174000', largeFile)
      expect(result.success).toBe(false)
      expect(result.error).toContain('melebihi batas maksimal 5 MB')
    })

    it('menolak format file yang dilarang seperti file executable (.exe)', async () => {
      const exeFile = new File(['binary content'], 'virus.exe', {
        type: 'application/x-msdownload',
      })

      const result = await uploadAttachment('submission', '123e4567-e89b-12d3-a456-426614174000', exeFile)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Format file tidak didukung')
    })

    it('menerima file PDF berukuran valid dan memanggil storage upload', async () => {
      const validPdf = new File(['sample content'], 'tugas.pdf', {
        type: 'application/pdf',
      })

      const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'path/to/file' }, error: null })
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: mockUpload,
          }),
        },
      } as any

      const result = await uploadAttachment(
        'assignment',
        '123e4567-e89b-12d3-a456-426614174000',
        validPdf,
        mockSupabase
      )

      expect(result.success).toBe(true)
      expect(result.path).toContain('assignment/123e4567-e89b-12d3-a456-426614174000/')
      expect(result.path).toContain('tugas.pdf')
      expect(mockUpload).toHaveBeenCalledOnce()
    })
  })
})
