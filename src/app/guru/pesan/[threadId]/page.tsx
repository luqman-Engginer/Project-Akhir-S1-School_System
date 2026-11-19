import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ThreadView } from '@/components/chat/ThreadView';
import { getThreadDetailData } from '@/lib/server/chatData';

export default async function GuruThreadDetailPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
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

  const data = await getThreadDetailData(supabase, threadId, profile.id);
  if (!data) {
    notFound();
  }

  return (
    <ThreadView
      currentProfileId={profile.id}
      currentRole="teacher"
      thread={data.thread}
      otherParty={data.otherParty}
      initialMessages={data.messages}
      backHref="/guru/pesan"
    />
  );
}
