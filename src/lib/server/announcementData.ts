import { SupabaseClient } from '@supabase/supabase-js';
import type { AnnouncementItem } from '@/components/announcements/AnnouncementList';
import type { AnnouncementDetailData } from '@/components/announcements/AnnouncementDetail';
import type { UserRole } from '@/types/database';

export async function getAnnouncementsForUser(
  supabase: SupabaseClient,
  profileId: string
): Promise<AnnouncementItem[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select(`
      id,
      title,
      body,
      target,
      class_id,
      is_pinned,
      created_at,
      class:classes(name),
      author:profiles!announcements_author_id_fkey(full_name, role),
      reads:announcement_reads(user_id)
    `)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((item: any) => {
    const isRead = (item.reads || []).some((r: any) => r.user_id === profileId);

    return {
      id: item.id,
      title: item.title,
      body: item.body,
      target: item.target,
      class_id: item.class_id,
      class_name: item.class?.name || null,
      is_pinned: item.is_pinned,
      created_at: item.created_at,
      author_name: item.author?.full_name || 'Sekolah',
      author_role: (item.author?.role || 'admin') as UserRole,
      is_read: isRead,
    };
  });
}

export async function getAnnouncementDetail(
  supabase: SupabaseClient,
  announcementId: string
): Promise<AnnouncementDetailData | null> {
  const { data, error } = await supabase
    .from('announcements')
    .select(`
      id,
      title,
      body,
      target,
      class_id,
      is_pinned,
      created_at,
      author_id,
      class:classes(name),
      author:profiles!announcements_author_id_fkey(full_name, role)
    `)
    .eq('id', announcementId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    body: data.body,
    target: data.target,
    class_name: (data as any).class?.name || null,
    is_pinned: data.is_pinned,
    created_at: data.created_at,
    author_id: data.author_id,
    author_name: (data as any).author?.full_name || 'Sekolah',
    author_role: ((data as any).author?.role || 'admin') as UserRole,
  };
}
