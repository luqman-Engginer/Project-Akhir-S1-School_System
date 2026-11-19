import { createClient } from '@/lib/supabase/client'

export type AttachmentKind = 'assignment' | 'submission' | 'leave' | 'message'

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

/**
 * Membersihkan nama file dari karakter berbahaya, spasi, dan path traversal.
 */
export function sanitizeFileName(fileName: string): string {
  // 1. Ambil nama dasar saja, buang path traversal (../ atau ..\)
  let clean = fileName.replace(/^.*[\\/]/, '')

  // 2. Ganti spasi dengan tanda minus
  clean = clean.replace(/\s+/g, '-')

  // 3. Hapus karakter yang bukan alfanumerik, minus, underscore, atau titik
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '')

  // 4. Jika nama menjadi kosong, berikan fallback
  if (!clean || clean === '.') {
    clean = 'document'
  }

  return clean
}

export interface UploadAttachmentResult {
  success: boolean
  path?: string
  error?: string
}

/**
 * Mengunggah file lampiran ke Supabase Storage bucket 'attachments'
 * dengan validasi ukuran dan MIME type di sisi aplikasi.
 */
export async function uploadAttachment(
  kind: AttachmentKind,
  relatedId: string,
  file: File,
  customSupabase?: ReturnType<typeof createClient>
): Promise<UploadAttachmentResult> {
  // 1. Validasi Ukuran File (Maksimal 5 MB)
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      success: false,
      error: 'Ukuran file melebihi batas maksimal 5 MB.',
    }
  }

  // 2. Validasi Tipe File (MIME Type)
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as any)) {
    return {
      success: false,
      error: 'Format file tidak didukung. Harap gunakan format PDF, PNG, JPG, atau DOCX.',
    }
  }

  // 3. Bentuk path aman: <kind>/<relatedId>/<uuid>-<safeFileName>
  const safeName = sanitizeFileName(file.name)
  const fileUuid = crypto.randomUUID()
  const storagePath = `${kind}/${relatedId}/${fileUuid}-${safeName}`

  const supabase = customSupabase ?? createClient()

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return {
      success: false,
      error: `Gagal mengunggah file: ${uploadError.message}`,
    }
  }

  return {
    success: true,
    path: storagePath,
  }
}

/**
 * Mendapatkan Signed URL untuk file privat dari Supabase Storage.
 * Default masa berlaku: 300 detik (5 menit).
 */
export async function getSignedUrl(
  filePath: string,
  expiresInSeconds: number = 300,
  customSupabase?: ReturnType<typeof createClient>
): Promise<string | null> {
  const supabase = customSupabase ?? createClient()

  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(filePath, expiresInSeconds)

  if (error || !data) {
    return null
  }

  return data.signedUrl
}

/**
 * Alias helper yang mengembalikan objek { signedUrl, error } untuk UI.
 */
export async function getAttachmentSignedUrl(
  filePath: string,
  expiresInSeconds: number = 300,
  customSupabase?: ReturnType<typeof createClient>
): Promise<{ signedUrl: string | null; error?: string }> {
  const url = await getSignedUrl(filePath, expiresInSeconds, customSupabase)
  if (!url) {
    return { signedUrl: null, error: 'Gagal membuat tautan berkas privat' }
  }
  return { signedUrl: url }
}
