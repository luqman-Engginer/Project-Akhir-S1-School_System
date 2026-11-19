import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  ClassesSubjectsManager,
  AdminClassItem,
  AdminSubjectItem,
  AdminTeachingOption,
  AdminScheduleItem,
} from '@/components/admin/ClassesSubjectsManager';

export default async function AdminKelasMapelPage() {
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

  // 1. Ambil data Kelas
  const { data: rawClasses } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      academic_year,
      homeroom_teacher_id,
      homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(full_name),
      student_classes(count)
    `)
    .order('name');

  const classes: AdminClassItem[] = (rawClasses || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    academic_year: c.academic_year,
    homeroom_teacher_name: c.homeroom_teacher?.full_name || null,
    homeroom_teacher_id: c.homeroom_teacher_id,
    student_count: c.student_classes?.[0]?.count || 0,
  }));

  // 2. Ambil data Mata Pelajaran
  const { data: rawSubjects } = await supabase
    .from('subjects')
    .select(`
      id,
      name,
      teachings(count)
    `)
    .order('name');

  const subjects: AdminSubjectItem[] = (rawSubjects || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    teaching_count: s.teachings?.[0]?.count || 0,
  }));

  // 3. Ambil Guru Pengampu Aktif
  const { data: rawTeachers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'teacher')
    .eq('is_active', true)
    .order('full_name');

  const teachers = (rawTeachers || []).map((t) => ({
    id: t.id,
    name: t.full_name,
  }));

  // 4. Ambil Teachings (Penugasan Guru di Kelas)
  const { data: rawTeachings } = await supabase
    .from('teachings')
    .select(`
      id,
      class_id,
      subject_id,
      teacher_id,
      subject:subjects(name),
      teacher:profiles(full_name)
    `)
    .order('created_at');

  const teachings: AdminTeachingOption[] = (rawTeachings || []).map((t: any) => ({
    id: t.id,
    class_id: t.class_id,
    subject_id: t.subject_id,
    teacher_id: t.teacher_id,
    subject_name: t.subject?.name || '',
    teacher_name: t.teacher?.full_name || '',
  }));

  // 5. Ambil Seluruh Jadwal
  const { data: rawSchedules } = await supabase
    .from('schedules')
    .select(`
      id,
      day_of_week,
      start_time,
      end_time,
      teaching:teachings!inner(
        id,
        class_id,
        subject:subjects(name),
        teacher:profiles(full_name)
      )
    `)
    .order('day_of_week')
    .order('start_time');

  const schedules: AdminScheduleItem[] = (rawSchedules || []).map((s: any) => ({
    id: s.id,
    class_id: s.teaching?.class_id || '',
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    subject_name: s.teaching?.subject?.name || '',
    teacher_name: s.teaching?.teacher?.full_name || '',
  }));

  return (
    <ClassesSubjectsManager
      classes={classes}
      subjects={subjects}
      teachers={teachers}
      teachings={teachings}
      schedules={schedules}
    />
  );
}
