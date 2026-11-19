import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { UserDetailManager } from '@/components/admin/UserDetailManager';
import type { UserRole } from '@/types/database';

export default async function AdminUserDetailPage({
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

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!callerProfile || callerProfile.role !== 'admin') redirect('/login');

  // 1. Ambil data profil target
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!targetProfile) notFound();

  // 2. Ambil kelas saat ini (jika murid)
  const { data: studentClassRow } = await supabase
    .from('student_classes')
    .select('class_id, class:classes(id, name)')
    .eq('student_id', id)
    .maybeSingle();

  const currentClass = studentClassRow?.class
    ? { id: (studentClassRow.class as any).id, name: (studentClassRow.class as any).name }
    : null;

  // 3. Ambil seluruh kelas yang tersedia
  const { data: allClasses } = await supabase
    .from('classes')
    .select('id, name')
    .order('name');

  // 4. Orang tua tertaut (jika target adalah murid)
  const { data: parentRels } = await supabase
    .from('parent_students')
    .select('parent:profiles!parent_students_parent_id_fkey(id, full_name, phone)')
    .eq('student_id', id);

  const linkedParents = (parentRels || [])
    .map((r: any) => r.parent)
    .filter(Boolean)
    .map((p: any) => ({
      id: p.id,
      fullName: p.full_name,
      phone: p.phone,
    }));

  // Seluruh orang tua aktif untuk pilihan tautan
  const { data: allParents } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'parent')
    .eq('is_active', true)
    .order('full_name');

  const availableParents = (allParents || []).filter(
    (p) => !linkedParents.some((lp: any) => lp.id === p.id)
  ).map((p) => ({ id: p.id, fullName: p.full_name }));

  // 5. Anak tertaut (jika target adalah orang tua)
  const { data: childRels } = await supabase
    .from('parent_students')
    .select(`
      student:profiles!parent_students_student_id_fkey(
        id,
        full_name,
        student_classes(class:classes(name))
      )
    `)
    .eq('parent_id', id);

  const linkedChildren = (childRels || [])
    .map((r: any) => r.student)
    .filter(Boolean)
    .map((s: any) => ({
      id: s.id,
      fullName: s.full_name,
      className: s.student_classes?.[0]?.class?.name || null,
    }));

  // Seluruh murid aktif untuk pilihan anak
  const { data: allStudents } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      student_classes(class:classes(name))
    `)
    .eq('role', 'student')
    .eq('is_active', true)
    .order('full_name');

  const availableStudents = (allStudents || [])
    .filter((s) => !linkedChildren.some((lc: any) => lc.id === s.id))
    .map((s: any) => ({
      id: s.id,
      fullName: s.full_name,
      className: s.student_classes?.[0]?.class?.name || null,
    }));

  // 6. Penugasan guru (jika target adalah guru)
  const { data: teachingsData } = await supabase
    .from('teachings')
    .select(`
      id,
      subject:subjects(name),
      class:classes(name)
    `)
    .eq('teacher_id', id);

  const teachings = (teachingsData || []).map((t: any) => ({
    id: t.id,
    subjectName: t.subject?.name || 'Mata Pelajaran',
    className: t.class?.name || 'Kelas',
  }));

  return (
    <UserDetailManager
      user={{
        id: targetProfile.id,
        fullName: targetProfile.full_name,
        email: targetProfile.email,
        role: targetProfile.role as UserRole,
        phone: targetProfile.phone,
        isActive: targetProfile.is_active,
        hasLoggedIn: Boolean(targetProfile.auth_user_id),
      }}
      currentClass={currentClass}
      availableClasses={(allClasses || []).map((c) => ({ id: c.id, name: c.name }))}
      linkedParents={linkedParents}
      availableParents={availableParents}
      linkedChildren={linkedChildren}
      availableStudents={availableStudents}
      teachings={teachings}
    />
  );
}
