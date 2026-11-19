import { createClient } from '@/lib/supabase/server';
import { AppLayout } from '@/components/layout/AppLayout';

export default async function MuridLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = {
    id: undefined as string | undefined,
    fullName: 'Murid',
    email: user?.email || '',
  };

  let unreadCount = 0;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (data) {
      profile = {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
      };

      const { data: countData } = await supabase.rpc('get_unread_notification_count');
      unreadCount = typeof countData === 'number' ? countData : 0;
    }
  }

  return (
    <AppLayout role="student" user={profile} unreadCount={unreadCount}>
      {children}
    </AppLayout>
  );
}
