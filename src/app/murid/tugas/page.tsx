import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MuridTugasList, MuridAssignmentItem } from './MuridTugasList';

export default async function MuridTugasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil murid & kelasnya
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      student_classes(class_id, class:classes(name))
    `)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  const classId = (profile as any).student_classes?.[0]?.class_id;
  const className = (profile as any).student_classes?.[0]?.class?.name || '';

  let assignments: MuridAssignmentItem[] = [];

  if (classId) {
    // Ambil daftar tugas di kelas ini beserta status pengumpulan murid
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        description,
        deadline,
        teaching:teachings!assignments_teaching_id_fkey(
          class_id,
          subject:subjects(name),
          teacher:profiles!teachings_teacher_id_fkey(full_name)
        )
      `)
      .eq('teaching.class_id', classId)
      .order('deadline', { ascending: true });

    if (!error && data) {
      // Ambil status dari assignment_status_view untuk murid ini
      const { data: statusData } = await supabase
        .from('assignment_status_view')
        .select('*')
        .eq('student_id', profile.id);

      const statusMap = new Map<string, any>();
      (statusData || []).forEach((s) => {
        statusMap.set(s.assignment_id, s);
      });

      assignments = data
        .filter((item: any) => item.teaching && item.teaching.class_id === classId)
        .map((item: any) => {
          const st = statusMap.get(item.id);
          return {
            id: item.id,
            title: item.title,
            description: item.description,
            deadline: item.deadline,
            subject_name: item.teaching?.subject?.name || 'Mata Pelajaran',
            teacher_name: item.teaching?.teacher?.full_name || 'Bapak/Ibu Guru',
            status: st?.status || 'not_submitted',
            score: st?.score ?? null,
            feedback: st?.feedback ?? null,
            graded_at: st?.graded_at ?? null,
          };
        });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Tugas Sekolah
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Daftar tugas kelas <strong>{className || 'Anda'}</strong> yang perlu dikerjakan dan riwayat penilaian.
        </p>
      </div>

      <MuridTugasList assignments={assignments} />
    </div>
  );
}
