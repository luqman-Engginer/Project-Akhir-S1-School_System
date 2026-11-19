'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

export async function fetchNotifications(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { notifications: [], unreadCount: 0 };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return { notifications: [], unreadCount: 0 };
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, link, type, is_read, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) {
      return { notifications: [], unreadCount: 0 };
    }

    const unreadCount = data.filter((n) => !n.is_read).length;
    return { notifications: data as NotificationItem[], unreadCount };
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const supabase = await createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) return { success: false };

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}
