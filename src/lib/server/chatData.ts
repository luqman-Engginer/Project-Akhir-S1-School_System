import { SupabaseClient } from '@supabase/supabase-js';
import type { ChatThreadItem } from '@/components/chat/ThreadList';
import type { ChatMessageItem } from '@/components/chat/ThreadView';
import type { UserRole } from '@/types/database';
import { getSignedUrl } from '@/lib/storage';

export async function getUserThreads(
  supabase: SupabaseClient,
  profileId: string
): Promise<ChatThreadItem[]> {
  const { data: participations, error } = await supabase
    .from('thread_participants')
    .select(`
      thread_id,
      last_read_at,
      thread:threads!thread_participants_thread_id_fkey(
        id,
        category,
        subject,
        status,
        student_id,
        created_by,
        created_at,
        updated_at,
        student:profiles!threads_student_id_fkey(full_name),
        participants:thread_participants(
          user_id,
          profile:profiles(id, full_name, role, phone)
        ),
        messages(id, body, created_at, sender_id)
      )
    `)
    .eq('user_id', profileId)
    .order('thread(updated_at)', { ascending: false });

  if (error || !participations) {
    return [];
  }

  const items: ChatThreadItem[] = [];

  for (const p of participations) {
    const t = (p as any).thread;
    if (!t) continue;

    const otherParticipant = (t.participants || []).find(
      (part: any) => part.user_id !== profileId
    );
    const rawProfile = otherParticipant?.profile;
    const otherProfile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

    const otherPartyName = otherProfile?.full_name || 'Bapak/Ibu Guru';
    const otherPartyRole = (otherProfile?.role || 'teacher') as UserRole;
    const otherPartyPhone = otherProfile?.phone || null;

    const msgs = [...(t.messages || [])].sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastMsg = msgs[0];

    const lastReadAt = p.last_read_at ? new Date(p.last_read_at).getTime() : 0;
    const unreadCount = (t.messages || []).filter((m: any) => {
      if (m.sender_id === profileId) return false;
      const msgTime = new Date(m.created_at).getTime();
      return msgTime > lastReadAt;
    }).length;

    items.push({
      id: t.id,
      category: t.category,
      subject: t.subject,
      status: t.status,
      student_id: t.student_id,
      student_name: t.student?.full_name || null,
      other_party_name: otherPartyName,
      other_party_role: otherPartyRole,
      other_party_phone: otherPartyPhone,
      last_message_body: lastMsg?.body || '',
      last_message_at: lastMsg?.created_at || t.updated_at,
      unread_count: unreadCount,
    });
  }

  return items.sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );
}

export async function getThreadDetailData(
  supabase: SupabaseClient,
  threadId: string,
  currentProfileId: string
) {
  // 1. Verifikasi kepesertaan thread
  const { data: myPart, error: partError } = await supabase
    .from('thread_participants')
    .select('thread_id, last_read_at')
    .eq('thread_id', threadId)
    .eq('user_id', currentProfileId)
    .maybeSingle();

  if (partError || !myPart) {
    return null;
  }

  // 2. Ambil info thread
  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .select(`
      id,
      category,
      subject,
      status,
      student_id,
      created_by,
      created_at,
      student:profiles!threads_student_id_fkey(full_name),
      participants:thread_participants(
        user_id,
        profile:profiles(id, full_name, role, phone)
      )
    `)
    .eq('id', threadId)
    .maybeSingle();

  if (threadError || !thread) {
    return null;
  }

  // 3. Lawan bicara
  const otherPart = (thread.participants || []).find(
    (p: any) => p.user_id !== currentProfileId
  );
  const rawOtherProfile = otherPart?.profile;
  const otherProfile = Array.isArray(rawOtherProfile) ? rawOtherProfile[0] : rawOtherProfile;

  const otherParty = {
    id: otherProfile?.id || '',
    name: otherProfile?.full_name || 'Pengguna',
    role: (otherProfile?.role || 'teacher') as UserRole,
    phone: otherProfile?.phone || null,
  };

  // 4. Ambil pesan-pesan dalam thread
  const { data: messagesData } = await supabase
    .from('messages')
    .select(`
      id,
      sender_id,
      body,
      attachment_path,
      created_at,
      sender:profiles!messages_sender_id_fkey(id, full_name, role)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  const messages: ChatMessageItem[] = [];

  for (const m of messagesData || []) {
    let attachmentUrl: string | null = null;
    if (m.attachment_path) {
      attachmentUrl = await getSignedUrl(m.attachment_path, 300);
    }

    const isMine = m.sender_id === currentProfileId;
    const rawSender = m.sender;
    const sender = Array.isArray(rawSender) ? rawSender[0] : rawSender;

    messages.push({
      id: m.id,
      sender_id: m.sender_id,
      sender_name: isMine ? 'Anda' : sender?.full_name || otherParty.name,
      sender_role: (sender?.role || otherParty.role) as UserRole,
      body: m.body,
      attachment_path: m.attachment_path,
      attachment_url: attachmentUrl,
      created_at: m.created_at,
      status: 'sent',
    });
  }

  return {
    thread: {
      id: thread.id,
      category: thread.category,
      subject: thread.subject,
      status: thread.status,
      student_id: thread.student_id,
      student_name: (thread as any).student?.full_name || null,
    },
    otherParty,
    messages,
  };
}
