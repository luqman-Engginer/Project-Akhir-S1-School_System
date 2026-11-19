import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AssignmentForm, TeachingOption } from '../AssignmentForm';

interface NewAssignmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewAssignmentPage({
  params,
}: NewAssignmentPageProps) {
  const { id: classId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil guru
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  // Ambil data kelas
  const { data: classData } = await supabase
    .from('classes')
    .select('id, name')
    .eq('id', classId)
    .maybeSingle();

  if (!classData) {
    notFound();
  }

  // Ambil penugasan guru di kelas ini
  const { data: teachingsData } = await supabase
    .from('teachings')
    .select(`
      id,
      subject:subjects(name)
    `)
    .eq('class_id', classId)
    .eq('teacher_id', profile.id);

  if (!teachingsData || teachingsData.length === 0) {
    redirect('/guru');
  }

  const teachings: TeachingOption[] = teachingsData.map((t: any) => ({
    id: t.id,
    subjectName: t.subject?.name || 'Mata Pelajaran',
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/guru/kelas/${classId}?tab=tugas`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Tugas Kelas {classData.name}</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Buat Tugas Baru
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
          Tentukan instruksi, batas waktu pengumpulan, dan materi lampiran untuk kelas {classData.name}.
        </p>
      </div>

      <AssignmentForm
        mode="create"
        classId={classId}
        className={classData.name}
        teachings={teachings}
      />
    </div>
  );
}
