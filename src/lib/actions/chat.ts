'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const CreateThreadSchema = z.object({
  category: z.enum(['leave', 'consultation', 'assignment', 'other'], {
    message: 'Kategori percakapan tidak valid',
  }),
  subject: z
    .string()
    .trim()
    .min(3, 'Judul pesan minimal 3 karakter')
    .max(100, 'Judul pesan maksimal 100 karakter'),
  studentId: z.string().uuid().nullable().optional(),
  recipientIds: z
    .array(z.string().uuid())
    .min(1, 'Pilih minimal satu penerima pesan'),
  firstMessage: z
    .string()
    .trim()
    .min(1, 'Isi pesan tidak boleh kosong')
    .max(2000, 'Isi pesan maksimal 2000 karakter'),
  attachmentPath: z.string().nullable().optional(),
});

export async function createThreadAction(rawInput: unknown): Promise<{
  success: boolean;
  threadId?: string;
  error?: string;
}> {
  try {
    const parsed = CreateThreadSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Data formulir tidak valid',
      };
    }

    const { category, subject, studentId, recipientIds, firstMessage, attachmentPath } =
      parsed.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi berakhir, silakan login kembali.' };
    }

    // Panggil RPC create_thread
    const { data: threadId, error } = await supabase.rpc('create_thread', {
      p_category: category,
      p_subject: subject,
      p_student_id: studentId || null,
      p_recipient_ids: recipientIds,
      p_first_message: firstMessage,
      p_attachment_path: attachmentPath || null,
    });

    if (error) {
      // Pemetaan pesan error ramah
      let userMsg = error.message;
      if (userMsg.includes('tidak mengajar di kelas')) {
        userMsg = 'Guru yang dipilih tidak mengajar di kelas yang bersangkutan.';
      } else if (userMsg.includes('hanya boleh membuka percakapan dengan Guru')) {
        userMsg = 'Anda hanya dapat membuka pesan percakapan dengan Bapak/Ibu Guru.';
      } else if (userMsg.includes('Privasi dilanggar')) {
        userMsg = 'Percakapan tidak boleh memuat orang tua dan murid dalam satu utas yang sama.';
      } else if (userMsg.includes('Admin tidak diizinkan')) {
        userMsg = 'Akun admin tidak memiliki akses perpesanan pribadi.';
      }

      return { success: false, error: userMsg };
    }

    revalidatePath('/murid/pesan');
    revalidatePath('/guru/pesan');
    revalidatePath('/ortu/pesan');
    return { success: true, threadId: threadId as string };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Terjadi gangguan saat membuat percakapan.',
    };
  }
}

const SendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Pesan tidak boleh kosong')
    .max(2000, 'Pesan maksimal 2000 karakter'),
  attachmentPath: z.string().nullable().optional(),
});

export async function sendMessageAction(
  threadId: string,
  rawInput: unknown
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const parsed = SendMessageSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Isi pesan tidak valid',
      };
    }

    const { body, attachmentPath } = parsed.data;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi berakhir, silakan login kembali.' };
    }

    // Ambil profile ID user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return { success: false, error: 'Profil pengguna tidak ditemukan.' };
    }

    // Simpan pesan ke tabel messages
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: profile.id,
        body,
        attachment_path: attachmentPath || null,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/guru/pesan/${threadId}`);
    revalidatePath(`/murid/pesan/${threadId}`);
    revalidatePath(`/ortu/pesan/${threadId}`);
    return { success: true, messageId: inserted.id };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Terjadi gangguan saat mengirim pesan.',
    };
  }
}

export async function updateThreadStatusAction(
  threadId: string,
  newStatus: 'done' | 'new'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi berakhir, silakan login kembali.' };
    }

    const { error } = await supabase
      .from('threads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', threadId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/guru/pesan/${threadId}`);
    revalidatePath(`/murid/pesan/${threadId}`);
    revalidatePath(`/ortu/pesan/${threadId}`);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Terjadi gangguan saat mengubah status percakapan.',
    };
  }
}

export async function markThreadReadAction(
  threadId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi berakhir' };
    }

    const { error } = await supabase.rpc('mark_thread_read', {
      p_thread_id: threadId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}
