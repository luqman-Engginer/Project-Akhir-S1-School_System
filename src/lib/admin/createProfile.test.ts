import { describe, it, expect, vi } from 'vitest'
import { createProfile, createProfileInputSchema } from './createProfile'

describe('createProfile Unit Tests', () => {
  describe('Input Validation Schema', () => {
    it('menolak nama yang terlalu pendek (< 2 karakter)', () => {
      const result = createProfileInputSchema.safeParse({
        email: 'budi@gmail.com',
        full_name: 'A',
        role: 'student',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('minimal 2 karakter')
      }
    })

    it('menolak nama yang lebih dari 80 karakter', () => {
      const result = createProfileInputSchema.safeParse({
        email: 'budi@gmail.com',
        full_name: 'A'.repeat(81),
        role: 'student',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('maksimal 80 karakter')
      }
    })

    it('menolak format nomor HP Indonesia yang salah', () => {
      const result = createProfileInputSchema.safeParse({
        email: 'budi@gmail.com',
        full_name: 'Budi Santoso',
        role: 'student',
        phone: '12345',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('nomor telepon Indonesia')
      }
    })

    it('menerima nomor HP Indonesia yang sah (+62 atau 08)', () => {
      const res1 = createProfileInputSchema.safeParse({
        email: 'budi@gmail.com',
        full_name: 'Budi Santoso',
        role: 'student',
        phone: '081234567890',
      })
      expect(res1.success).toBe(true)

      const res2 = createProfileInputSchema.safeParse({
        email: 'budi@gmail.com',
        full_name: 'Budi Santoso',
        role: 'student',
        phone: '+6281234567890',
      })
      expect(res2.success).toBe(true)
    })
  })

  describe('createProfile Action Authorization & Duplicate Checks', () => {
    it('menolak email tidak valid (bukan gmail)', async () => {
      const result = await createProfile({
        email: 'luqman@smk',
        full_name: 'Luqman Hakim',
        role: 'teacher',
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('@gmail.com')
    })

    it('menolak jika pemanggil bukan role admin', async () => {
      // Mock client di mana user yang login memiliki role 'teacher'
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'teacher-auth-id' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'teacher', is_active: true },
                error: null,
              }),
            }),
          }),
        }),
      } as any

      const result = await createProfile(
        {
          email: 'budi.baru@gmail.com',
          full_name: 'Budi Baru',
          role: 'student',
        },
        mockClient
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Hanya admin')
    })

    it('menolak jika email sudah terdaftar (duplikat)', async () => {
      // Mock client di mana caller adalah admin, namun email sudah ada di tabel profiles
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'admin-auth-id' } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn((cols: string) => ({
                eq: vi.fn((field: string, val: any) => ({
                  maybeSingle: vi.fn().mockImplementation(async () => {
                    // Cek pertama untuk caller auth_user_id
                    if (field === 'auth_user_id') {
                      return { data: { role: 'admin', is_active: true }, error: null }
                    }
                    // Cek kedua untuk email_normalized
                    if (field === 'email_normalized') {
                      return { data: { id: 'existing-id', full_name: 'Budi Lama' }, error: null }
                    }
                    return { data: null, error: null }
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any

      const result = await createProfile(
        {
          email: 'budi.baru@gmail.com',
          full_name: 'Budi Baru',
          role: 'student',
        },
        mockClient
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email ini sudah terdaftar atas nama Budi Lama')
    })
  })
})
