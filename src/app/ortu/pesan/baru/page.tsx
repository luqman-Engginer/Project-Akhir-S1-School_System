import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewThreadForm, StudentChildOption, RecipientOption } from '@/components/chat/NewThreadForm';

export default async function OrtuPesanBaruPage({
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

  // Profil orang tua
  const { data: parentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!parentProfile) {
    redirect('/login');
  }

  // Ambil anak-anak dari orang tua ini
  const { data: rels } = await supabase
    .from('parent_students')
    .select(`
      student_id,
      student:profiles!parent_students_student_id_fkey(
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
      )
    `)
    .eq('parent_id', parentProfile.id);

  const parentChildren: StudentChildOption[] = [];

  for (const r of rels || []) {
    const stu = (r as any).student;
    if (!stu) continue;

    const stuClass = stu.student_classes?.[0]?.class;
    const classId = stuClass?.id;
    const className = stuClass?.name || 'Kelas';
    const homeroomTeacherId = stuClass?.homeroom_teacher_id;

    let teachers: RecipientOption[] = [];

    if (classId) {
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

    parentChildren.push({
      id: stu.id,
      name: stu.full_name,
      className,
      teachers,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/ortu/pesan"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline mb-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Kembali ke Daftar Pesan</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Pesan Baru ke Guru
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Konsultasi bimbingan, izin sakit, atau perkembangan belajar ananda langsung dengan wali kelas/guru pengampu.
        </p>
      </div>

      <NewThreadForm
        currentRole="parent"
        initialCategory={kategori}
        initialStudentId={student}
        parentChildren={parentChildren}
      />
    </div>
  );
}
