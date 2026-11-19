'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { todayWIB } from '@/lib/dates';

const CreateLeaveSchema = z
  .object({
    studentId: z.string().uuid({ message: 'ID siswa tidak valid' }),
    type: z.enum(['sick', 'excused'], { message: 'Jenis izin harus Sakit atau Izin' }),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal mulai harus YYYY-MM-DD' }),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal selesai harus YYYY-MM-DD' }),
    reason: z
      .string()
      .min(10, { message: 'Alasan izin minimal 10 karakter' })
      .max(300, { message: 'Alasan izin maksimal 300 karakter' }),
    attachmentPath: z.string().nullable().optional(),
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
    path: ['dateTo'],
  });

export async function createLeaveRequestAction(formData: {
  studentId: string;
  type: 'sick' | 'excused';
  dateFrom: string;
  dateTo: string;
  reason: string;
  attachmentPath?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const validated = CreateLeaveSchema.safeParse(formData);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      return { success: false, error: firstIssue?.message || 'Data tidak valid' };
    }

    const { studentId, type, dateFrom, dateTo, reason, attachmentPath } =
      validated.data;

    // Batasan tanggal: tidak boleh < 3 hari ke belakang
    const minDateObj = new Date();
    minDateObj.setDate(minDateObj.getDate() - 3);
    const minAllowedDate = todayWIB(minDateObj);

    if (dateFrom < minAllowedDate) {
      return {
        success: false,
        error:
          'Pengajuan izin terlambat dibatasi maksimal 3 hari ke belakang dari hari ini.',
      };
    }

    // Rentang maksimal 14 hari
    const fromTime = new Date(dateFrom).getTime();
    const toTime = new Date(dateTo).getTime();
    const dayDiff = Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24)) + 1;

    if (dayDiff > 14) {
      return {
        success: false,
        error: 'Rentang pengajuan surat izin maksimal 14 hari berturut-turut.',
      };
    }

    const supabase = await createClient();

    // Ambil profile ID pengaju (auth.uid() -> profile.id)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi Anda telah berakhir, silakan masuk kembali.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return { success: false, error: 'Profil pengguna tidak ditemukan.' };
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        student_id: studentId,
        submitted_by: profile.id,
        type,
        date_from: dateFrom,
        date_to: dateTo,
        reason: reason.trim(),
        attachment_path: attachmentPath || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/guru');
    revalidatePath('/guru/izin');
    revalidatePath('/ortu/izin');
    revalidatePath('/murid/izin');

    return { success: true, id: data.id };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Terjadi gangguan saat mengajukan izin',
    };
  }
}

export async function reviewLeaveRequestAction(
  leaveId: string,
  status: 'approved' | 'rejected',
  reviewNote?: string | null
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const supabase = await createClient();

    const updatePayload: {
      status: 'approved' | 'rejected';
      review_note?: string | null;
    } = { status };

    if (reviewNote !== undefined) {
      updatePayload.review_note = reviewNote ? reviewNote.trim() : null;
    }

    const { error } = await supabase
      .from('leave_requests')
      .update(updatePayload)
      .eq('id', leaveId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/guru');
    revalidatePath('/guru/izin');
    revalidatePath('/ortu/perkembangan');
    revalidatePath('/murid/jadwal-nilai');

    return {
      success: true,
      message:
        status === 'approved'
          ? 'Permohonan izin berhasil disetujui.'
          : 'Permohonan izin telah ditolak.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Terjadi gangguan saat memproses izin',
    };
  }
}

export async function cancelLeaveRequestAction(
  leaveId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', leaveId)
      .eq('status', 'pending');

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/ortu/izin');
    revalidatePath('/murid/izin');
    revalidatePath('/guru');
    revalidatePath('/guru/izin');

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Terjadi gangguan saat membatalkan izin',
    };
  }
}

/**
 * Alias fungsi untuk TeacherLeaveItem
 */
export const updateLeaveRequestStatus = reviewLeaveRequestAction;
