import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AnnouncementDetail } from '@/components/announcements/AnnouncementDetail';
import { getAnnouncementDetail } from '@/lib/server/announcementData';

export default async function OrtuPengumumanDetailPage({
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
    .select('id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'parent') redirect('/login');

  const announcement = await getAnnouncementDetail(supabase, id);
  if (!announcement) notFound();

  return (
    <AnnouncementDetail
      currentProfileId={profile.id}
      currentRole="parent"
      announcement={announcement}
      backHref="/ortu/pengumuman"
    />
  );
}
