'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const AnnouncementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Judul pengumuman minimal 3 karakter')
    .max(100, 'Judul pengumuman maksimal 100 karakter'),
  body: z
    .string()
    .trim()
    .min(10, 'Isi pengumuman minimal 10 karakter')
    .max(2000, 'Isi pengumuman maksimal 2000 karakter'),
  target: z.enum(['all', 'class', 'parents'], {
    message: 'Target penerima pengumuman tidak valid',
  }),
  classId: z.string().uuid().nullable().optional(),
  isPinned: z.boolean().optional().default(false),
});

export async function createAnnouncementAction(rawInput: unknown): Promise<{
  success: boolean;
  announcementId?: string;
  recipientCount?: number;
  error?: string;
}> {
  try {
    const parsed = AnnouncementSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Data pengumuman tidak valid',
      };
    }

    const { title, body, target, classId, isPinned } = parsed.data;

    if (target === 'class' && !classId) {
      return {
        success: false,
        error: 'Pilih kelas yang dituju untuk pengumuman target kelas.',
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi berakhir, silakan login kembali.' };
    }

    // Ambil profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
      return {
        success: false,
        error: 'Hanya bapak/ibu guru dan admin yang dapat membuat pengumuman.',
      };
    }

    if (target === 'all' && profile.role !== 'admin') {
      return {
        success: false,
        error: 'Pengumuman untuk seluruh sekolah hanya dapat dibuat oleh Admin.',
      };
    }

    // Hanya admin yang diizinkan menyematkan (pin) pengumuman
    const finalPinned = profile.role === 'admin' ? isPinned : false;

    // Perkiraan jumlah penerima
    let estimatedRecipients = 0;
    if (target === 'all') {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .neq('id', profile.id)
        .neq('role', 'admin');
      estimatedRecipients = count || 0;
    } else if (target === 'parents') {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('role', 'parent')
        .neq('id', profile.id);
      estimatedRecipients = count || 0;
    } else if (target === 'class' && classId) {
      const { count: studentCount } = await supabase
        .from('student_classes')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId);

      const { count: parentCount } = await supabase
        .from('parent_students')
        .select('student_id, student:profiles!parent_students_student_id_fkey(student_classes(class_id))', {
          count: 'exact',
          head: true,
        })
        .eq('student.student_classes.class_id', classId);

      estimatedRecipients = (studentCount || 0) + (parentCount || 0);
    }

    const { data: inserted, error: insertError } = await supabase
      .from('announcements')
      .insert({
        author_id: profile.id,
        target,
        class_id: target === 'class' ? classId : null,
        title,
        body,
        is_pinned: finalPinned,
      })
      .select('id')
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    revalidatePath('/admin/pengumuman');
    revalidatePath('/guru/pengumuman');
    revalidatePath('/ortu/pengumuman');
    revalidatePath('/murid');
    revalidatePath('/ortu');
    revalidatePath('/guru');

    return {
      success: true,
      announcementId: inserted.id,
      recipientCount: estimatedRecipients,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Terjadi gangguan saat menyimpan pengumuman.',
    };
  }
}

export async function updateAnnouncementAction(
  id: string,
  rawInput: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = AnnouncementSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Data pengumuman tidak valid',
      };
    }

    const { title, body, target, classId, isPinned } = parsed.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi berakhir, silakan login kembali.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return { success: false, error: 'Profil tidak ditemukan' };
    }

    // Ambil data lama
    const { data: oldAnn } = await supabase
      .from('announcements')
      .select('author_id')
      .eq('id', id)
      .maybeSingle();

    if (!oldAnn) {
      return { success: false, error: 'Pengumuman tidak ditemukan.' };
    }

    if (oldAnn.author_id !== profile.id && profile.role !== 'admin') {
      return {
        success: false,
        error: 'Anda hanya dapat mengubah pengumuman yang Anda buat sendiri.',
      };
    }

    const finalPinned = profile.role === 'admin' ? isPinned : false;

    const { error: updateError } = await supabase
      .from('announcements')
      .update({
        title,
        body,
        target,
        class_id: target === 'class' ? classId : null,
        is_pinned: finalPinned,
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/admin/pengumuman');
    revalidatePath('/guru/pengumuman');
    revalidatePath('/ortu/pengumuman');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Gagal memperbarui pengumuman.',
    };
  }
}

export async function deleteAnnouncementAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi berakhir' };
    }

    const { error } = await supabase.from('announcements').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/pengumuman');
    revalidatePath('/guru/pengumuman');
    revalidatePath('/ortu/pengumuman');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menghapus pengumuman.',
    };
  }
}

export async function markAnnouncementReadAction(
  announcementId: string
): Promise<{ success: boolean }> {
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
      .from('announcement_reads')
      .insert({
        announcement_id: announcementId,
        user_id: profile.id,
      })
      .select();

    return { success: true };
  } catch {
    return { success: false };
  }
}
