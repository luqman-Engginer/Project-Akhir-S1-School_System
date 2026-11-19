import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ThreadList } from '@/components/chat/ThreadList';
import { getUserThreads } from '@/lib/server/chatData';

export default async function GuruPesanPage() {
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

  if (!profile || profile.role !== 'teacher') {
    redirect('/login');
  }

  const threads = await getUserThreads(supabase, profile.id);

  return (
    <ThreadList
      currentRole="teacher"
      threads={threads}
      newMessageHref="/guru/pesan/baru"
    />
  );
}
