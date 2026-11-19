import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserListClient, AdminUserListItem, NeedsAttentionCounts } from '@/components/admin/UserListClient';

export default async function AdminPenggunaPage() {
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

  // 1. Ambil seluruh pengguna
  const { data: profilesData } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      role,
      phone,
      is_active,
      auth_user_id,
      student_classes(class:classes(name)),
      parent_students_as_student:parent_students!parent_students_student_id_fkey(parent_id),
      parent_students_as_parent:parent_students!parent_students_parent_id_fkey(student_id),
      teachings(id)
    `)
    .order('created_at', { ascending: false });

  const users: AdminUserListItem[] = (profilesData || []).map((p: any) => {
    const className = p.student_classes?.[0]?.class?.name || null;
    const parentCount = (p.parent_students_as_student || []).length;
    const childCount = (p.parent_students_as_parent || []).length;
    const teachingCount = (p.teachings || []).length;

    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      phone: p.phone,
      is_active: p.is_active,
      has_logged_in: Boolean(p.auth_user_id),
      class_name: className,
      parent_count: parentCount,
      child_count: childCount,
      teaching_count: teachingCount,
    };
  });

  // 2. Hitung metrik "Data yang perlu dilengkapi"
  let studentsWithoutClass = 0;
  let studentsWithoutParent = 0;
  let parentsWithoutChild = 0;
  let teachersWithoutTeaching = 0;
  let usersWithoutPhone = 0;

  users.forEach((u) => {
    if (!u.is_active) return; // Hanya hitung pengguna aktif

    if (u.role === 'student') {
      if (!u.class_name) studentsWithoutClass++;
      if ((u.parent_count || 0) === 0) studentsWithoutParent++;
    } else if (u.role === 'parent') {
      if ((u.child_count || 0) === 0) parentsWithoutChild++;
    } else if (u.role === 'teacher') {
      if ((u.teaching_count || 0) === 0) teachersWithoutTeaching++;
    }

    if (!u.phone) {
      usersWithoutPhone++;
    }
  });

  const counts: NeedsAttentionCounts = {
    studentsWithoutClass,
    studentsWithoutParent,
    parentsWithoutChild,
    teachersWithoutTeaching,
    usersWithoutPhone,
  };

  return <UserListClient users={users} counts={counts} />;
}
