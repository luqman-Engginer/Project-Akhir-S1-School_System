import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function PesanRedirectPage({
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
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role === 'admin') {
    redirect('/admin');
  }

  if (profile.role === 'teacher') {
    redirect(`/guru/pesan/${threadId}`);
  }
  if (profile.role === 'student') {
    redirect(`/murid/pesan/${threadId}`);
  }
  if (profile.role === 'parent') {
    redirect(`/ortu/pesan/${threadId}`);
  }

  redirect('/');
}
