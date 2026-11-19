'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function sendParentReminderAction(
  studentId: string,
  text: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, error: 'Pesan pengingat tidak boleh kosong.' };
    }

    if (trimmed.length > 200) {
      return { success: false, error: 'Pesan pengingat maksimal 200 karakter.' };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('send_parent_reminder', {
      p_student_id: studentId,
      p_text: trimmed,
    });

    if (error) {
      if (error.message.includes('DAILY_REMINDER_LIMIT_EXCEEDED')) {
        return {
          success: false,
          error:
            'Batas pengingat harian tercapai (maksimal 5 pesan per hari). Silakan coba lagi besok.',
        };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/ortu');
    return {
      success: true,
      message: 'Pesan pengingat berhasil dikirimkan ke anak tercinta.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi gangguan saat mengirim pengingat',
    };
  }
}
