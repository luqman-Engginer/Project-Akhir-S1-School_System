import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { getAnnouncementsForUser } from '@/lib/server/announcementData';

export default async function GuruPengumumanPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'teacher') redirect('/login');

  const announcements = await getAnnouncementsForUser(supabase, profile.id);

  return (
    <AnnouncementList
      currentRole="teacher"
      announcements={announcements}
      createHref="/guru/pengumuman/baru"
      detailBaseHref="/guru/pengumuman"
    />
  );
}
