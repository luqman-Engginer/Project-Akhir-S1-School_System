import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewThreadForm, RecipientOption } from '@/components/chat/NewThreadForm';

export default async function MuridPesanBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; tugas?: string; teacher?: string }>;
}) {
  const { kategori, tugas, teacher } = await searchParams;
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
      student_classes(
        class_id,
        class:classes(
          id,
          name,
          homeroom_teacher_id
        )
      )
    `)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  const studentClass = (profile as any).student_classes?.[0]?.class;
  const classId = studentClass?.id;
  const homeroomTeacherId = studentClass?.homeroom_teacher_id;

  let teachers: RecipientOption[] = [];

  if (classId) {
    // Ambil guru pengampu mata pelajaran di kelas ini
    const { data: teachingsData } = await supabase
      .from('teachings')
      .select(`
        teacher_id,
        subject:subjects(name),
        teacher:profiles!teachings_teacher_id_fkey(id, full_name)
      `)
      .eq('class_id', classId);

    const teacherMap = new Map<string, { id: string; name: string; subjects: string[] }>();

    (teachingsData || []).forEach((t: any) => {
      if (!t.teacher) return;
      const tid = t.teacher.id;
      const subName = t.subject?.name || 'Mata Pelajaran';
      if (!teacherMap.has(tid)) {
        teacherMap.set(tid, { id: tid, name: t.teacher.full_name, subjects: [subName] });
      } else {
        const exist = teacherMap.get(tid)!;
        if (!exist.subjects.includes(subName)) {
          exist.subjects.push(subName);
        }
      }
    });

    // Ambil info wali kelas jika belum ada di map
    if (homeroomTeacherId && !teacherMap.has(homeroomTeacherId)) {
      const { data: hr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', homeroomTeacherId)
        .maybeSingle();

      if (hr) {
        teacherMap.set(hr.id, { id: hr.id, name: hr.full_name, subjects: ['Wali Kelas'] });
      }
    }

    teachers = Array.from(teacherMap.values()).map((t) => ({
      id: t.id,
      name: t.name,
      role: 'teacher' as const,
      detail: t.subjects.join(', '),
      isHomeroom: t.id === homeroomTeacherId,
    }));
  }

  // Jika datang dari tugas (?tugas=<id>), isi subjek otomatis
  let initialSubject = '';
  if (tugas) {
    const { data: asg } = await supabase
      .from('assignments')
      .select('title')
      .eq('id', tugas)
      .maybeSingle();

    if (asg) {
      initialSubject = `Pertanyaan tugas: ${asg.title}`;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/murid/pesan"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline mb-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Kembali ke Daftar Pesan</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Pesan Baru ke Guru
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Konsultasikan pertanyaan belajar atau keperluan izin dengan bapak/ibu guru pengampu.
        </p>
      </div>

      <NewThreadForm
        currentRole="student"
        initialCategory={kategori || (tugas ? 'assignment' : undefined)}
        initialSubject={initialSubject}
        initialRecipientId={teacher}
        studentTeachers={teachers}
      />
    </div>
  );
}
