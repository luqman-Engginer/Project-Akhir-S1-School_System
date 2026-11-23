/**
 * Normalisasi konfigurasi Supabase dari environment variables.
 * Menjamin URL selalu berbentuk origin bersih tanpa trailing slash atau subpath
 * (misal mencegah https://xxx.supabase.co/rest/v1 atau https://xxx.supabase.co/ yang menyebabkan error "Invalid path specified in request URL").
 */
export function getSupabaseConfig() {
  let url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/^['"]|['"]$/g, '')
  let anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/^['"]|['"]$/g, '')
  let serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^['"]|['"]$/g, '')

  if (url) {
    // Normalisasi protokol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    try {
      const parsed = new URL(url)
      // Gunakan hanya protokol + host (tanpa subpath /rest/v1 atau trailing slash)
      url = parsed.origin
    } catch {
      // Fallback jika parsing URL gagal
      url = url.replace(/\/+(rest|auth)\/v\d+.*$/i, '').replace(/\/+$/, '')
    }
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  }
}
