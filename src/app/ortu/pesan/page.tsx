import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ThreadList } from '@/components/chat/ThreadList';
import { getUserThreads } from '@/lib/server/chatData';

export default async function OrtuPesanPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'parent') {
    redirect('/login');
  }

  const threads = await getUserThreads(supabase, profile.id);

  return (
    <ThreadList
      currentRole="parent"
      threads={threads}
      newMessageHref="/ortu/pesan/baru"
    />
  );
}
