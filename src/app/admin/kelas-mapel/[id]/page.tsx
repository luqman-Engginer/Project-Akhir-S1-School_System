import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import {
  ClassDetailManager,
  ClassDetailInfo,
  ClassStudentItem,
  AvailableStudentItem,
  ClassTeachingItem,
  SimpleOption,
} from '@/components/admin/ClassDetailManager';

interface AdminClassDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminClassDetailPage({ params }: AdminClassDetailPageProps) {
  const { id: classId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') redirect('/login');

  // 1. Ambil info kelas
  const { data: classData } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      academic_year,
      homeroom_teacher_id,
      homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(full_name)
    `)
    .eq('id', classId)
    .maybeSingle();

  if (!classData) {
    notFound();
  }

  const cls: ClassDetailInfo = {
    id: classData.id,
    name: classData.name,
    academic_year: classData.academic_year,
    homeroom_teacher_name: (classData.homeroom_teacher as any)?.full_name || null,
    homeroom_teacher_id: classData.homeroom_teacher_id,
  };

  // 2. Ambil murid di kelas ini
  const { data: classStudentsData } = await supabase
    .from('student_classes')
    .select(`
      student:profiles!inner(
        id,
        full_name,
        email,
        phone,
        parent_students_as_student:parent_students!parent_students_student_id_fkey(parent_id)
      )
    `)
    .eq('class_id', classId)
    .order('created_at');

  const students: ClassStudentItem[] = (classStudentsData || []).map((row: any) => ({
    id: row.student.id,
    full_name: row.student.full_name,
    email: row.student.email,
    phone: row.student.phone,
    parent_count: (row.student.parent_students_as_student || []).length,
  }));

  // 3. Ambil seluruh murid aktif yang BELUM memiliki kelas
  const { data: allActiveStudents } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      student_classes(class_id)
    `)
    .eq('role', 'student')
    .eq('is_active', true)
    .order('full_name');

  const availableStudents: AvailableStudentItem[] = (allActiveStudents || [])
    .filter((st: any) => !st.student_classes || st.student_classes.length === 0)
    .map((st: any) => ({
      id: st.id,
      full_name: st.full_name,
      email: st.email,
    }));

  // 4. Ambil pengajaran (teachings) di kelas ini
  const { data: teachingsData } = await supabase
    .from('teachings')
    .select(`
      id,
      subject_id,
      teacher_id,
      subject:subjects(name),
      teacher:profiles(full_name)
    `)
    .eq('class_id', classId)
    .order('created_at');

  const teachings: ClassTeachingItem[] = (teachingsData || []).map((t: any) => ({
    id: t.id,
    subject_id: t.subject_id,
    subject_name: t.subject?.name || '',
    teacher_id: t.teacher_id,
    teacher_name: t.teacher?.full_name || '',
  }));

  // 5. Ambil opsi mapel & guru
  const { data: subjectsData } = await supabase
    .from('subjects')
    .select('id, name')
    .order('name');

  const availableSubjects: SimpleOption[] = (subjectsData || []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const { data: teachersData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'teacher')
    .eq('is_active', true)
    .order('full_name');

  const availableTeachers: SimpleOption[] = (teachersData || []).map((t) => ({
    id: t.id,
    name: t.full_name,
  }));

  return (
    <ClassDetailManager
      cls={cls}
      students={students}
      availableStudents={availableStudents}
      teachings={teachings}
      availableSubjects={availableSubjects}
      availableTeachers={availableTeachers}
    />
  );
}
