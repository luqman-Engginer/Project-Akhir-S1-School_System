import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AnnouncementRedirectPage({
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) redirect('/login');

  if (profile.role === 'admin') {
    redirect(`/admin/pengumuman/${id}`);
  }
  if (profile.role === 'teacher') {
    redirect(`/guru/pengumuman/${id}`);
  }
  if (profile.role === 'student') {
    redirect(`/murid/pengumuman/${id}`);
  }
  if (profile.role === 'parent') {
    redirect(`/ortu/pengumuman/${id}`);
  }

  redirect('/');
}
