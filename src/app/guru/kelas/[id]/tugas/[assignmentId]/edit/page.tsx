import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AssignmentForm, TeachingOption } from '../../AssignmentForm';

interface EditAssignmentPageProps {
  params: Promise<{ id: string; assignmentId: string }>;
}

export default async function EditAssignmentPage({
  params,
}: EditAssignmentPageProps) {
  const { id: classId, assignmentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  // Ambil detail tugas
  const { data: asgData, error: asgError } = await supabase
    .from('assignments')
    .select(`
      id,
      teaching_id,
      title,
      description,
      deadline,
      attachment_path,
      teaching:teachings!assignments_teaching_id_fkey(
        id,
        class_id,
        teacher_id,
        class:classes(name),
        subject:subjects(name)
      ),
      submissions(id)
    `)
    .eq('id', assignmentId)
    .maybeSingle();

  if (asgError || !asgData) {
    notFound();
  }

  // Guard: Hanya guru pemilik penugasan yang boleh edit
  if ((asgData.teaching as any)?.teacher_id !== profile.id) {
    redirect(`/guru/kelas/${classId}`);
  }

  const className = (asgData.teaching as any)?.class?.name || 'Kelas';
  const teachings: TeachingOption[] = [
    {
      id: asgData.teaching_id,
      subjectName: (asgData.teaching as any)?.subject?.name || 'Mata Pelajaran',
    },
  ];

  const submissionsCount = (asgData.submissions || []).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/guru/kelas/${classId}/tugas/${assignmentId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Penilaian</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Ubah Tugas: {asgData.title}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
          Perbarui rincian instruksi atau batas waktu pengumpulan tugas kelas {className}.
        </p>
      </div>

      <AssignmentForm
        mode="edit"
        classId={classId}
        className={className}
        teachings={teachings}
        initialData={{
          id: asgData.id,
          teachingId: asgData.teaching_id,
          title: asgData.title,
          description: asgData.description,
          deadline: asgData.deadline,
          attachmentPath: asgData.attachment_path,
          submissionsCount,
        }}
      />
    </div>
  );
}
