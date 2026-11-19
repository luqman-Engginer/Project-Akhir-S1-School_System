import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { getAnnouncementsForUser } from '@/lib/server/announcementData';

export default async function MuridPengumumanPage() {
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

  if (!profile || profile.role !== 'student') redirect('/login');

  const announcements = await getAnnouncementsForUser(supabase, profile.id);

  return (
    <AnnouncementList
      currentRole="student"
      announcements={announcements}
      detailBaseHref="/murid/pengumuman"
    />
  );
}
