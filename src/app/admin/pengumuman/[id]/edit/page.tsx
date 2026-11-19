import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm';

export default async function AdminPengumumanEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: ann } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!ann) notFound();

  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .order('name');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/pengumuman/${id}`}
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline mb-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Kembali ke Detail Pengumuman</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Ubah Pengumuman
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Sesuaikan judul, isi, target audiens, atau status sematan pengumuman.
        </p>
      </div>

      <AnnouncementForm
        currentRole="admin"
        classes={(classes || []).map((c) => ({ id: c.id, name: c.name }))}
        initialData={{
          id: ann.id,
          title: ann.title,
          body: ann.body,
          target: ann.target,
          classId: ann.class_id,
          isPinned: ann.is_pinned,
        }}
        backHref={`/admin/pengumuman/${id}`}
      />
    </div>
  );
}
