import { describe, it, expect } from 'vitest'
import { z } from 'zod'

describe('Setup Test - Zod & Testing Environment', () => {
  it('validasi schema Zod bekerja dengan benar', () => {
    const envSchema = z.object({
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    })

    const sample = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-sample',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-sample',
    }

    const result = envSchema.safeParse(sample)
    expect(result.success).toBe(true)
  })

  it('menolak konfigurasi invalid', () => {
    const envSchema = z.object({
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    })

    const invalid = {
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    }

    const result = envSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
