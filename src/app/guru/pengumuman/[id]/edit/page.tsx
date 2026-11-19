import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm';

export default async function GuruPengumumanEditPage({
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

  if (!profile || profile.role !== 'teacher') redirect('/login');

  const { data: ann } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!ann) notFound();

  // Pastikan hanya pembuat yang bisa mengedit
  if (ann.author_id !== profile.id) {
    notFound();
  }

  const { data: teachings } = await supabase
    .from('teachings')
    .select('class:classes(id, name)')
    .eq('teacher_id', profile.id);

  const { data: homeroomClasses } = await supabase
    .from('classes')
    .select('id, name')
    .eq('homeroom_teacher_id', profile.id);

  const classMap = new Map<string, string>();
  (teachings || []).forEach((t: any) => {
    if (t.class) classMap.set(t.class.id, t.class.name);
  });
  (homeroomClasses || []).forEach((c: any) => {
    classMap.set(c.id, c.name);
  });

  const teacherClasses = Array.from(classMap.entries()).map(([cid, cname]) => ({
    id: cid,
    name: cname,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/guru/pengumuman/${id}`}
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline mb-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Kembali ke Detail Pengumuman</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Ubah Pengumuman
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Sesuaikan judul atau isi pengumuman kelas Anda.
        </p>
      </div>

      <AnnouncementForm
        currentRole="teacher"
        classes={teacherClasses}
        initialData={{
          id: ann.id,
          title: ann.title,
          body: ann.body,
          target: ann.target,
          classId: ann.class_id,
          isPinned: ann.is_pinned,
        }}
        backHref={`/guru/pengumuman/${id}`}
      />
    </div>
  );
}
