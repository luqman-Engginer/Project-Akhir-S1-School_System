'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfile, type UserProfile } from '@/lib/auth/getProfile'
import { validateGmail, normalizeGmail } from '@/lib/email'
import type { Role } from '@/lib/auth/roles'

// Format nomor HP Indonesia (contoh: 08123456789 atau +628123456789)
const indonesianPhoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,11}$/

export const createProfileInputSchema = z.object({
  email: z.string().min(1, 'Email tidak boleh kosong'),
  full_name: z
    .string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(80, 'Nama lengkap maksimal 80 karakter'),
  role: z.enum(['admin', 'teacher', 'student', 'parent'], {
    message: 'Role harus salah satu dari: admin, teacher, student, parent',
  }),
  phone: z
    .string()
    .trim()
    .refine(
      (val) => !val || indonesianPhoneRegex.test(val),
      'Format nomor telepon Indonesia tidak valid (contoh: 081234567890)'
    )
    .nullable()
    .optional(),
})

export type CreateProfileInput = z.infer<typeof createProfileInputSchema>

export interface CreateProfileResult {
  success: boolean
  error?: string
  profile?: UserProfile
}

/**
 * Server action bagi Admin untuk mendaftarkan akun baru ke whitelist tabel profiles.
 */
export async function createProfile(
  input: CreateProfileInput,
  customClient?: Awaited<ReturnType<typeof createClient>>
): Promise<CreateProfileResult> {
  // 1. Validasi skema input
  const parseResult = createProfileInputSchema.safeParse(input)
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0].message,
    }
  }

  const { full_name, role, phone } = parseResult.data

  // 2. Validasi email dengan helper validateGmail
  const emailValidation = validateGmail(input.email)
  if (!emailValidation.success) {
    return {
      success: false,
      error: emailValidation.suggestion
        ? `${emailValidation.error} (${emailValidation.suggestion})`
        : emailValidation.error,
    }
  }

  const validEmail = emailValidation.email
  const normalizedEmail = emailValidation.normalized

  // 3. Verifikasi pemanggil adalah Admin
  const supabase = customClient ?? (await createClient())
  const callerProfile = await getProfile(supabase)

  if (!callerProfile || callerProfile.role !== 'admin') {
    return {
      success: false,
      error: 'Hanya admin yang memiliki hak untuk menambah pengguna baru',
    }
  }

  // 4. Periksa duplikasi berdasarkan normalize_gmail
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('email_normalized', normalizedEmail)
    .maybeSingle()

  if (existingProfile) {
    return {
      success: false,
      error: `Email ini sudah terdaftar atas nama ${existingProfile.full_name}`,
    }
  }

  // 5. Insert profil baru
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      email: validEmail,
      email_normalized: normalizedEmail,
      full_name,
      role: role as Role,
      phone: phone || null,
      is_active: true,
      is_demo: false,
    })
    .select()
    .single()

  if (insertError || !newProfile) {
    return {
      success: false,
      error: `Gagal mendaftarkan profil: ${insertError?.message || 'Database error'}`,
    }
  }

  return {
    success: true,
    profile: newProfile as UserProfile,
  }
}
