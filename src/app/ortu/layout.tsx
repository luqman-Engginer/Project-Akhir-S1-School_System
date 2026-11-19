import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChildInfo } from '@/components/layout/ChildSwitcher';

export default async function OrtuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = {
    id: undefined as string | undefined,
    fullName: 'Orang Tua / Wali',
    email: user?.email || '',
  };

  let unreadCount = 0;
  let childrenList: ChildInfo[] = [];
  let activeChildId = cookieStore.get('active_child_id')?.value || '';

  if (user) {
    const { data: parentProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (parentProfile) {
      profile = {
        id: parentProfile.id,
        fullName: parentProfile.full_name,
        email: parentProfile.email,
      };

      const { data: countData } = await supabase.rpc('get_unread_notification_count');
      unreadCount = typeof countData === 'number' ? countData : 0;

      // Ambil daftar anak
      const { data: studentRels } = await supabase
        .from('parent_students')
        .select(`
          student:profiles!parent_students_student_id_fkey(
            id,
            full_name,
            student_classes(
              class:classes(name)
            )
          )
        `)
        .eq('parent_id', parentProfile.id);

      if (studentRels && studentRels.length > 0) {
        childrenList = studentRels.map((rel: any) => {
          const student = rel.student;
          const classItem = student?.student_classes?.[0]?.class;
          return {
            id: student?.id,
            name: student?.full_name || 'Anak',
            className: classItem?.name || undefined,
          };
        });

        // Verifikasi activeChildId
        const exists = childrenList.some((c) => c.id === activeChildId);
        if (!exists && childrenList.length > 0) {
          activeChildId = childrenList[0].id;
        }
      }
    }
  }

  return (
    <AppLayout
      role="parent"
      user={profile}
      childrenList={childrenList}
      activeChildId={activeChildId}
      unreadCount={unreadCount}
    >
      {children}
    </AppLayout>
  );
}
