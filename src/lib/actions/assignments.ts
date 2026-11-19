'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isValidHttpUrl } from '@/lib/urls';

// 1. Schema Buat Tugas
const CreateAssignmentSchema = z.object({
  teachingId: z.string().uuid({ message: 'ID penugasan mata pelajaran tidak valid' }),
  title: z
    .string()
    .min(3, { message: 'Judul tugas minimal 3 karakter' })
    .max(100, { message: 'Judul tugas maksimal 100 karakter' }),
  description: z
    .string()
    .max(2000, { message: 'Deskripsi tugas maksimal 2000 karakter' })
    .optional()
    .nullable(),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Format batas waktu tidak valid',
  }),
  attachmentPath: z.string().nullable().optional(),
});

export async function createAssignmentAction(formData: {
  teachingId: string;
  title: string;
  description?: string | null;
  deadline: string;
  attachmentPath?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const validated = CreateAssignmentSchema.safeParse(formData);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message };
    }

    const { teachingId, title, description, deadline, attachmentPath } =
      validated.data;

    // Deadline tidak boleh di masa lalu saat membuat
    const deadlineDate = new Date(deadline);
    if (deadlineDate.getTime() < Date.now()) {
      return {
        success: false,
        error: 'Batas waktu pengumpulan tidak boleh di masa lampau.',
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        teaching_id: teachingId,
        title: title.trim(),
        description: description?.trim() || null,
        deadline: deadlineDate.toISOString(),
        attachment_path: attachmentPath || null,
      })
      .select('id, teaching:teachings(class_id)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const classId = (data as any)?.teaching?.class_id;
    if (classId) {
      revalidatePath(`/guru/kelas/${classId}`);
    }
    revalidatePath('/guru');
    revalidatePath('/murid/tugas');
    revalidatePath('/ortu/perkembangan');

    return { success: true, id: data.id };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Terjadi gangguan saat membuat tugas',
    };
  }
}

// 2. Schema Ubah Tugas
const UpdateAssignmentSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Judul tugas minimal 3 karakter' })
    .max(100, { message: 'Judul tugas maksimal 100 karakter' }),
  description: z
    .string()
    .max(2000, { message: 'Deskripsi tugas maksimal 2000 karakter' })
    .optional()
    .nullable(),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Format batas waktu tidak valid',
  }),
  attachmentPath: z.string().nullable().optional(),
});

export async function updateAssignmentAction(
  assignmentId: string,
  formData: {
    title: string;
    description?: string | null;
    deadline: string;
    attachmentPath?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = UpdateAssignmentSchema.safeParse(formData);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message };
    }

    const { title, description, deadline, attachmentPath } = validated.data;
    const supabase = await createClient();

    const updatePayload: any = {
      title: title.trim(),
      description: description?.trim() || null,
      deadline: new Date(deadline).toISOString(),
    };

    if (attachmentPath !== undefined) {
      updatePayload.attachment_path = attachmentPath;
    }

    const { data, error } = await supabase
      .from('assignments')
      .update(updatePayload)
      .eq('id', assignmentId)
      .select('teaching:teachings(class_id)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const classId = (data as any)?.teaching?.class_id;
    if (classId) {
      revalidatePath(`/guru/kelas/${classId}`);
      revalidatePath(`/guru/kelas/${classId}/tugas/${assignmentId}`);
    }
    revalidatePath('/guru');
    revalidatePath('/murid/tugas');
    revalidatePath(`/murid/tugas/${assignmentId}`);

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Terjadi gangguan saat memperbarui tugas',
    };
  }
}

// 3. Hapus Tugas (Hanya boleh jika belum ada pengumpulan)
export async function deleteAssignmentAction(
  assignmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Cek pengumpulan yang sudah masuk
    const { count, error: countError } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('assignment_id', assignmentId);

    if (countError) {
      return { success: false, error: countError.message };
    }

    if (count && count > 0) {
      return {
        success: false,
        error:
          'Tugas tidak dapat dihapus karena sudah ada siswa yang mengumpulkan berkas.',
      };
    }

    const { data: deleted, error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)
      .select('teaching:teachings(class_id)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const classId = (deleted as any)?.teaching?.class_id;
    if (classId) {
      revalidatePath(`/guru/kelas/${classId}`);
    }
    revalidatePath('/guru');
    revalidatePath('/murid/tugas');

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Terjadi gangguan saat menghapus tugas',
    };
  }
}

// 4. Kumpulkan / Ubah Pengumpulan Tugas oleh Murid
export async function submitAssignmentAction(
  assignmentId: string,
  payload: {
    contentLink?: string | null;
    attachmentPath?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedLink = payload.contentLink ? payload.contentLink.trim() : null;
    const trimmedPath = payload.attachmentPath ? payload.attachmentPath.trim() : null;

    if (!trimmedLink && !trimmedPath) {
      return {
        success: false,
        error: 'Harap sertakan tautan (link) atau unggah berkas tugas.',
      };
    }

    if (trimmedLink && !isValidHttpUrl(trimmedLink)) {
      return {
        success: false,
        error:
          'Tautan tugas tidak valid. Harap gunakan alamat URL yang diawali http:// atau https://',
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi berakhir, silakan login kembali.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return { success: false, error: 'Profil murid tidak ditemukan.' };
    }

    // Cek apakah sudah ada submission
    const { data: existing } = await supabase
      .from('submissions')
      .select('id, status, score')
      .eq('assignment_id', assignmentId)
      .eq('student_id', profile.id)
      .maybeSingle();

    if (existing && (existing.status === 'graded' || existing.score !== null)) {
      return {
        success: false,
        error: 'Tugas yang sudah dinilai oleh guru tidak dapat diubah kembali.',
      };
    }

    if (existing) {
      // Update pengumpulan yang ada
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          content_link: trimmedLink,
          attachment_path: trimmedPath,
          submitted_at: new Date().toISOString(),
          status: 'submitted',
        })
        .eq('id', existing.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      // Insert pengumpulan baru
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({
          assignment_id: assignmentId,
          student_id: profile.id,
          content_link: trimmedLink,
          attachment_path: trimmedPath,
          submitted_at: new Date().toISOString(),
          status: 'submitted',
        });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    revalidatePath(`/murid/tugas/${assignmentId}`);
    revalidatePath('/murid/tugas');
    revalidatePath('/guru');
    revalidatePath('/ortu/perkembangan');

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Terjadi gangguan saat mengumpulkan tugas',
    };
  }
}

// 5. Simpan / Revisi Nilai oleh Guru
const GradeSubmissionSchema = z.object({
  submissionId: z.string().uuid({ message: 'ID pengumpulan tidak valid' }),
  score: z
    .number({ message: 'Nilai harus berupa angka' })
    .min(0, { message: 'Nilai minimal 0' })
    .max(100, { message: 'Nilai maksimal 100' }),
  feedback: z
    .string()
    .max(1000, { message: 'Catatan umpan balik maksimal 1000 karakter' })
    .optional()
    .nullable(),
});

export async function gradeSubmissionAction(
  submissionId: string,
  score: number,
  feedback?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = GradeSubmissionSchema.safeParse({
      submissionId,
      score,
      feedback,
    });

    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi berakhir, silakan login kembali.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return { success: false, error: 'Profil guru tidak ditemukan.' };
    }

    const { data, error } = await supabase
      .from('submissions')
      .update({
        score: validated.data.score,
        feedback: validated.data.feedback?.trim() || null,
        status: 'graded',
        graded_by: profile.id,
        graded_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select('assignment_id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.assignment_id) {
      revalidatePath(`/guru/kelas/[id]/tugas/${data.assignment_id}`, 'page');
      revalidatePath(`/murid/tugas/${data.assignment_id}`);
    }
    revalidatePath('/guru');
    revalidatePath('/murid/jadwal-nilai');
    revalidatePath('/ortu/perkembangan');

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Terjadi gangguan saat menyimpan nilai',
    };
  }
}
