import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  let isConnected = false
  let errorMessage: string | null = null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
    errorMessage = 'Error: Environment variable NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi di .env.local'
  } else {
    try {
      // Verifikasi client server bisa diinisialisasi
      await createClient()

      // Tes koneksi langsung ke health endpoint Supabase
      const healthUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`
      const res = await fetch(healthUrl, {
        headers: {
          apikey: supabaseAnonKey,
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        errorMessage = `Error koneksi Supabase (HTTP ${res.status}): ${res.statusText}`
      } else {
        isConnected = true
      }
    } catch (err: unknown) {
      errorMessage = `Error koneksi Supabase: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      {isConnected ? (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 font-semibold">
          Koneksi Supabase OK
        </div>
      ) : (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 font-semibold">
          {errorMessage}
        </div>
      )}
    </main>
  )
}
