import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewThreadForm, TeacherClassTarget, RecipientOption } from '@/components/chat/NewThreadForm';

export default async function GuruPesanBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; student?: string }>;
}) {
  const { kategori, student } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil guru
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!teacherProfile) {
    redirect('/login');
  }

  // 1. Ambil kelas-kelas yang diajar guru (dari teachings dan homeroom)
  const { data: teachings } = await supabase
    .from('teachings')
    .select(`
      class_id,
      class:classes(id, name)
    `)
    .eq('teacher_id', teacherProfile.id);

  const { data: homeroomClasses } = await supabase
    .from('classes')
    .select('id, name')
    .eq('homeroom_teacher_id', teacherProfile.id);

  const classMap = new Map<string, string>();
  (teachings || []).forEach((t: any) => {
    if (t.class) classMap.set(t.class.id, t.class.name);
  });
  (homeroomClasses || []).forEach((c: any) => {
    classMap.set(c.id, c.name);
  });

  const teacherClasses: TeacherClassTarget[] = [];

  for (const [classId, className] of classMap.entries()) {
    // Ambil murid di kelas ini
    const { data: studentRows } = await supabase
      .from('student_classes')
      .select(`
        student_id,
        student:profiles!student_classes_student_id_fkey(
          id,
          full_name,
          parents:parent_students!parent_students_student_id_fkey(
            parent:profiles!parent_students_parent_id_fkey(
              id,
              full_name,
              phone
            )
          )
        )
      `)
      .eq('class_id', classId);

    const students: RecipientOption[] = [];
    const parents: Array<RecipientOption & { studentId: string; studentName: string }> = [];

    (studentRows || []).forEach((row: any) => {
      const s = row.student;
      if (!s) return;

      students.push({
        id: s.id,
        name: s.full_name,
        role: 'student',
        detail: `Siswa ${className}`,
      });

      (s.parents || []).forEach((pr: any) => {
        if (!pr.parent) return;
        parents.push({
          id: pr.parent.id,
          name: pr.parent.full_name,
          role: 'parent',
          detail: `Wali dari ${s.full_name}`,
          studentId: s.id,
          studentName: s.full_name,
        });
      });
    });

    teacherClasses.push({
      classId,
      className,
      students,
      parents,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/guru/pesan"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline mb-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Kembali ke Daftar Pesan</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Pesan Baru ke Siswa / Orang Tua
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Kirimkan informasi atau konsultasi kepada murid bimbingan atau wali murid di kelas yang Anda ajar.
        </p>
      </div>

      <NewThreadForm
        currentRole="teacher"
        initialCategory={kategori}
        initialStudentId={student}
        teacherClasses={teacherClasses}
      />
    </div>
  );
}
