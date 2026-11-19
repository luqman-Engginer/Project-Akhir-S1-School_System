import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { getAnnouncementsForUser } from '@/lib/server/announcementData';

export default async function AdminPengumumanPage() {
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

  if (!profile || profile.role !== 'admin') redirect('/login');

  const announcements = await getAnnouncementsForUser(supabase, profile.id);

  return (
    <AnnouncementList
      currentRole="admin"
      announcements={announcements}
      createHref="/admin/pengumuman/baru"
      detailBaseHref="/admin/pengumuman"
    />
  );
}
