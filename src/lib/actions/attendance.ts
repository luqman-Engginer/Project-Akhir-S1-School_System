'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { todayWIB } from '@/lib/dates';

const AttendanceRecordSchema = z.object({
  student_id: z.string().uuid({ message: 'ID siswa tidak valid' }),
  status: z.enum(['present', 'sick', 'excused', 'absent'], {
    message: 'Status absensi tidak valid',
  }),
  note: z.string().nullable().optional(),
});

const SaveAttendanceSchema = z.object({
  classId: z.string().uuid({ message: 'ID kelas tidak valid' }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal harus YYYY-MM-DD' }),
  records: z
    .array(AttendanceRecordSchema)
    .min(1, { message: 'Minimal harus ada 1 catatan murid' }),
});

export async function saveAttendanceAction(
  classId: string,
  date: string,
  records: Array<{
    student_id: string;
    status: 'present' | 'sick' | 'excused' | 'absent';
    note?: string | null;
  }>
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const validated = SaveAttendanceSchema.safeParse({ classId, date, records });
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      return { success: false, error: firstIssue?.message || 'Data tidak valid' };
    }

    // Validasi batasan tanggal
    const today = todayWIB();
    if (date > today) {
      return {
        success: false,
        error: 'Tidak dapat mencatat absensi untuk tanggal di masa depan.',
      };
    }

    // Maksimal koreksi 7 hari ke belakang
    const minDateObj = new Date();
    minDateObj.setDate(minDateObj.getDate() - 7);
    const minDate = todayWIB(minDateObj);
    if (date < minDate) {
      return {
        success: false,
        error: 'Koreksi absensi dibatasi maksimal 7 hari ke belakang.',
      };
    }

    const supabase = await createClient();

    // Panggil RPC upsert_attendance_bulk dengan sesi user (RLS guru berlaku)
    const { data: count, error } = await supabase.rpc('upsert_attendance_bulk', {
      p_class_id: validated.data.classId,
      p_date: validated.data.date,
      p_records: validated.data.records,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Revalidasi rute-rute terkait
    revalidatePath('/guru');
    revalidatePath(`/guru/kelas/${classId}`);
    revalidatePath(`/guru/kelas/${classId}/absen`);
    revalidatePath('/ortu');
    revalidatePath('/murid');

    return {
      success: true,
      count: typeof count === 'number' ? count : records.length,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Terjadi gangguan saat menyimpan absensi',
    };
  }
}
