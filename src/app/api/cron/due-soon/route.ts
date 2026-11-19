import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'

export async function GET(request: Request) {
  // Rate Limiting (maksimal 10 request per menit)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'cron-due-soon'
  const { isAllowed } = checkRateLimit(`cron-due-soon:${ip}`, 10, 60_000)

  if (!isAllowed) {
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  // 1. Verifikasi header Authorization: Bearer CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const admin = createAdminClient()

    // 2. Jalankan fungsi notify_due_soon()
    const { data: count, error: notifyError } = await admin.rpc('notify_due_soon')

    if (notifyError) {
      return NextResponse.json(
        { success: false, error: notifyError.message },
        { status: 500 }
      )
    }

    // 3. Jalankan pembersihan notifikasi usang > 60 hari
    const { data: purgedCount } = await admin.rpc('purge_old_notifications')

    return NextResponse.json({
      success: true,
      remindersSent: count || 0,
      oldNotificationsPurged: purgedCount || 0,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
