import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm';

export default async function AdminPengumumanBaruPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') redirect('/login');

  // Ambil semua kelas untuk pilihan target
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .order('name');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/pengumuman"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline mb-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Kembali ke Daftar Pengumuman</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Buat Pengumuman Baru
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Rilis edaran resmi atau informasi penting untuk seluruh warga sekolah, orang tua, atau kelas tertentu.
        </p>
      </div>

      <AnnouncementForm
        currentRole="admin"
        classes={(classes || []).map((c) => ({ id: c.id, name: c.name }))}
        backHref="/admin/pengumuman"
      />
    </div>
  );
}
