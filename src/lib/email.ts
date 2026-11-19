import { z } from 'zod'

/**
 * Daftar domain salah ketik (typo) umum untuk Gmail.
 */
export const TYPO_GMAIL_DOMAINS = [
  'gmial.com',
  'gmail.co',
  'gmail.con',
  'gmai.com',
  'gmail',
  'gmial',
  'gmai',
  'gamil.com',
] as const

export interface GmailValidationSuccess {
  success: true
  email: string
  normalized: string
}

export interface GmailValidationFailure {
  success: false
  error: string
  suggestion?: string
}

export type GmailValidationResult = GmailValidationSuccess | GmailValidationFailure

/**
 * Fungsi utilitas untuk menormalisasi email Gmail:
 * - lowercase dan trim
 * - buang suffix "+tag" (misal luqman+tugas@gmail.com -> luqman@gmail.com)
 * - buang semua karakter titik '.' pada username (l.uqman -> luqman)
 */
export function normalizeGmail(email: string): string {
  const cleaned = email.trim().toLowerCase()
  const atIndex = cleaned.lastIndexOf('@')
  if (atIndex === -1) return cleaned

  const local = cleaned.substring(0, atIndex)
  const domain = cleaned.substring(atIndex + 1)

  if (domain === 'gmail.com') {
    const withoutTag = local.replace(/\+.*$/, '')
    const withoutDots = withoutTag.replace(/\./g, '')
    return `${withoutDots}@${domain}`
  }

  return cleaned
}

/**
 * Zod schema untuk memvalidasi input email Gmail.
 */
export const gmailSchema = z
  .string()
  .trim()
  .min(1, 'Email tidak boleh kosong')
  .refine((val) => !/\s/.test(val), {
    message: 'Email tidak boleh mengandung spasi',
  })
  .superRefine((val, ctx) => {
    const lower = val.toLowerCase()
    const atIndex = lower.indexOf('@')

    if (atIndex === -1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Format email tidak valid (harus mengandung @)',
      })
      return
    }

    const local = lower.substring(0, atIndex)
    const domain = lower.substring(atIndex + 1)

    if (!local) {
      ctx.addIssue({
        code: 'custom',
        message: 'Username sebelum @ tidak boleh kosong',
      })
      return
    }

    // Deteksi typo umum
    if ((TYPO_GMAIL_DOMAINS as readonly string[]).includes(domain)) {
      const suggestion = `Maksud kamu ${local}@gmail.com?`
      ctx.addIssue({
        code: 'custom',
        message: `Domain email tidak valid. ${suggestion}`,
      })
      return
    }

    // Wajib domain @gmail.com
    if (domain !== 'gmail.com') {
      ctx.addIssue({
        code: 'custom',
        message: 'Email harus menggunakan domain @gmail.com',
      })
      return
    }
  })

/**
 * Memvalidasi alamat email Gmail dengan Zod dan mengembalikan
 * status sukses atau pesan error beserta saran perbaikan jika ada typo.
 */
export function validateGmail(input: unknown): GmailValidationResult {
  const result = gmailSchema.safeParse(input)

  if (!result.success) {
    const firstIssue = result.error.issues[0]
    let suggestion: string | undefined

    if (firstIssue.message.includes('Maksud kamu')) {
      const match = firstIssue.message.match(/Maksud kamu [^?]+\?/)
      if (match) {
        suggestion = match[0]
      }
    }

    return {
      success: false,
      error: firstIssue.message,
      ...(suggestion ? { suggestion } : {}),
    }
  }

  const cleaned = result.data.toLowerCase()
  return {
    success: true,
    email: cleaned,
    normalized: normalizeGmail(cleaned),
  }
}
