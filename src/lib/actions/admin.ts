'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createProfile, CreateProfileInput } from '@/lib/admin/createProfile';
import { validateGmail, normalizeGmail } from '@/lib/email';
import { normalizeIdPhone } from '@/lib/whatsapp';
import type { UserRole } from '@/types/database';

async function verifyAdminCaller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Sesi berakhir, silakan login kembali.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    throw new Error('Akses ditolak: Hanya admin aktif yang dapat menjalankan tindakan ini.');
  }

  return { supabase, caller: profile };
}

// ====================================================================
// 1. KELOLA PENGGUNA
// ====================================================================
export async function createAdminUserAction(input: CreateProfileInput) {
  try {
    const res = await createProfile(input);
    if (res.success) {
      revalidatePath('/admin/pengguna');
      revalidatePath('/admin');
    }
    return res;
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi gangguan sistem',
    };
  }
}

export async function updateUserAction(
  userId: string,
  payload: {
    fullName: string;
    phone?: string | null;
    isActive: boolean;
    newEmail?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, caller } = await verifyAdminCaller();

    // 1. Cek profil target
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, email, email_normalized, role, is_active, auth_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (!targetProfile) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    // 2. Guard: Admin tidak boleh menonaktifkan dirinya sendiri
    if (caller.id === userId && !payload.isActive) {
      return {
        success: false,
        error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.',
      };
    }

    // 3. Guard: Admin tidak boleh menonaktifkan admin terakhir yang aktif
    if (targetProfile.role === 'admin' && !payload.isActive) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true);

      if ((count || 0) <= 1) {
        return {
          success: false,
          error: 'Tidak dapat menonaktifkan admin terakhir yang aktif di sistem.',
        };
      }
    }

    // 4. Ubah email (Hanya boleh jika belum pernah masuk / auth_user_id IS NULL)
    let emailToUpdate: string | undefined = undefined;
    let emailNormToUpdate: string | undefined = undefined;

    if (payload.newEmail && payload.newEmail.trim() !== targetProfile.email) {
      if (targetProfile.auth_user_id) {
        return {
          success: false,
          error:
            'Email tidak dapat diubah karena pengguna telah terhubung dengan akun login Google.',
        };
      }

      const emailVal = validateGmail(payload.newEmail);
      if (!emailVal.success) {
        return {
          success: false,
          error: emailVal.suggestion
            ? `${emailVal.error} (${emailVal.suggestion})`
            : emailVal.error,
        };
      }

      // Cek duplikasi email
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email_normalized', emailVal.normalized)
        .neq('id', userId)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          error: `Email ini sudah digunakan oleh ${existing.full_name}`,
        };
      }

      emailToUpdate = emailVal.email;
      emailNormToUpdate = emailVal.normalized;
    }

    // 5. Normalisasi nomor HP
    const normalizedPhone = payload.phone ? normalizeIdPhone(payload.phone) : null;
    if (payload.phone && !normalizedPhone) {
      return {
        success: false,
        error: 'Format nomor HP tidak valid (harus nomor HP Indonesia diawali 08/628).',
      };
    }

    const updateData: any = {
      full_name: payload.fullName.trim(),
      phone: normalizedPhone,
      is_active: payload.isActive,
      updated_at: new Date().toISOString(),
    };

    if (emailToUpdate && emailNormToUpdate) {
      updateData.email = emailToUpdate;
      updateData.email_normalized = emailNormToUpdate;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/admin/pengguna');
    revalidatePath(`/admin/pengguna/${userId}`);
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi gangguan sistem',
    };
  }
}

// ====================================================================
// 2. KELOLA KELAS & WALI KELAS
// ====================================================================
export async function createClassAction(payload: {
  name: string;
  academicYear: string;
  homeroomTeacherId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    const trimmedName = payload.name.trim();
    const trimmedYear = payload.academicYear.trim();

    if (!trimmedName) return { success: false, error: 'Nama kelas wajib diisi.' };
    if (!trimmedYear) return { success: false, error: 'Tahun ajaran wajib diisi.' };

    const { error } = await supabase.from('classes').insert({
      name: trimmedName,
      academic_year: trimmedYear,
      homeroom_teacher_id: payload.homeroomTeacherId || null,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

export async function updateClassAction(
  classId: string,
  payload: {
    name: string;
    academicYear: string;
    homeroomTeacherId?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    const { error } = await supabase
      .from('classes')
      .update({
        name: payload.name.trim(),
        academic_year: payload.academicYear.trim(),
        homeroom_teacher_id: payload.homeroomTeacherId || null,
      })
      .eq('id', classId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

export async function deleteClassAction(classId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    // Cek apakah ada murid di kelas ini
    const { count: studentCount } = await supabase
      .from('student_classes')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId);

    if (studentCount && studentCount > 0) {
      return {
        success: false,
        error: `Kelas tidak dapat dihapus karena masih menampung ${studentCount} siswa.`,
      };
    }

    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

// ====================================================================
// 3. KELOLA MATA PELAJARAN
// ====================================================================
export async function createSubjectAction(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'Nama mata pelajaran wajib diisi.' };

    // Cek keunikan nama mapel (case-insensitive)
    const { data: existing } = await supabase
      .from('subjects')
      .select('id')
      .ilike('name', trimmed)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Mata pelajaran dengan nama tersebut sudah ada.' };
    }

    const { error } = await supabase.from('subjects').insert({ name: trimmed });
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

export async function updateSubjectAction(
  subjectId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();
    const trimmed = name.trim();

    const { data: existing } = await supabase
      .from('subjects')
      .select('id')
      .ilike('name', trimmed)
      .neq('id', subjectId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Nama mata pelajaran tersebut sudah digunakan.' };
    }

    const { error } = await supabase.from('subjects').update({ name: trimmed }).eq('id', subjectId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

export async function deleteSubjectAction(subjectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    const { count } = await supabase
      .from('teachings')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subjectId);

    if (count && count > 0) {
      return {
        success: false,
        error: 'Mata pelajaran tidak dapat dihapus karena sudah ditugaskan ke guru mengajar.',
      };
    }

    const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

// ====================================================================
// 4. KELOLA PENUGASAN GURU (TEACHINGS)
// ====================================================================
export async function addTeachingAction(payload: {
  classId: string;
  subjectId: string;
  teacherId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    // Cek duplikasi pasangan
    const { data: existing } = await supabase
      .from('teachings')
      .select('id')
      .eq('class_id', payload.classId)
      .eq('subject_id', payload.subjectId)
      .eq('teacher_id', payload.teacherId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Guru ini sudah ditugaskan mengampu mata pelajaran tersebut di kelas ini.' };
    }

    const { error } = await supabase.from('teachings').insert({
      class_id: payload.classId,
      subject_id: payload.subjectId,
      teacher_id: payload.teacherId,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    revalidatePath(`/admin/kelas-mapel/${payload.classId}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

export async function removeTeachingAction(
  teachingId: string,
  classId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    // Guard: Cek apakah ada jadwal atau tugas yang bergantung
    const { count: scheduleCount } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('teaching_id', teachingId);

    if (scheduleCount && scheduleCount > 0) {
      return {
        success: false,
        error: `Pengajaran tidak dapat dihapus karena memiliki ${scheduleCount} sesi jadwal KBM aktif.`,
      };
    }

    const { count: assignmentCount } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('teaching_id', teachingId);

    if (assignmentCount && assignmentCount > 0) {
      return {
        success: false,
        error: `Pengajaran tidak dapat dihapus karena memiliki ${assignmentCount} tugas yang sudah dirilis.`,
      };
    }

    const { error } = await supabase.from('teachings').delete().eq('id', teachingId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    revalidatePath(`/admin/kelas-mapel/${classId}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

// ====================================================================
// 5. PENEMPATAN SISWA KE KELAS (STUDENT_CLASSES)
// ====================================================================
export async function assignStudentClassAction(
  studentId: string,
  classId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    // Guard: 1 murid hanya boleh memiliki 1 kelas aktif!
    const { data: existingClass } = await supabase
      .from('student_classes')
      .select('class:classes(name)')
      .eq('student_id', studentId)
      .maybeSingle();

    if (existingClass && (existingClass as any).class) {
      return {
        success: false,
        error: `Siswa ini sudah terdaftar di kelas ${(existingClass as any).class.name}. Keluarkan siswa terlebih dahulu sebelum memindahkan.`,
      };
    }

    const { error } = await supabase.from('student_classes').insert({
      student_id: studentId,
      class_id: classId,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    revalidatePath(`/admin/kelas-mapel/${classId}`);
    revalidatePath('/admin/pengguna');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

export async function removeStudentClassAction(
  studentId: string,
  classId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    const { error } = await supabase
      .from('student_classes')
      .delete()
      .eq('student_id', studentId)
      .eq('class_id', classId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    revalidatePath(`/admin/kelas-mapel/${classId}`);
    revalidatePath('/admin/pengguna');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

// ====================================================================
// 6. RELASI ORANG TUA - ANAK (PARENT_STUDENTS)
// ====================================================================
export async function linkParentStudentAction(
  parentId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    const { error } = await supabase
      .from('parent_students')
      .insert({ parent_id: parentId, student_id: studentId });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Hubungan anak dan orang tua ini sudah terdaftar.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/pengguna');
    revalidatePath(`/admin/pengguna/${parentId}`);
    revalidatePath(`/admin/pengguna/${studentId}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

export async function unlinkParentStudentAction(
  parentId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    const { error } = await supabase
      .from('parent_students')
      .delete()
      .eq('parent_id', parentId)
      .eq('student_id', studentId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/pengguna');
    revalidatePath(`/admin/pengguna/${parentId}`);
    revalidatePath(`/admin/pengguna/${studentId}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

// ====================================================================
// 7. KELOLA JADWAL KBM & DETEKSI BENTROK
// ====================================================================
export async function createScheduleAction(payload: {
  classId: string;
  teachingId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    if (payload.endTime <= payload.startTime) {
      return { success: false, error: 'Jam selesai harus lebih akhir daripada jam mulai.' };
    }

    // Ambil data nama guru dan nama kelas untuk pesan error yang informatif
    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payload.teacherId)
      .maybeSingle();

    const teacherName = teacherProfile?.full_name || 'Guru';

    // 1. Validasi Bentrok Kelas (kelas yang sama di hari yang sama)
    const { data: existingClassSchedules } = await supabase
      .from('schedules')
      .select(`
        id, start_time, end_time,
        subject:subjects!schedules_subject_id_fkey(name)
      `)
      .eq('class_id', payload.classId)
      .eq('day_of_week', payload.dayOfWeek);

    for (const s of existingClassSchedules || []) {
      const isOverlap = !(payload.endTime <= s.start_time || payload.startTime >= s.end_time);
      if (isOverlap) {
        return {
          success: false,
          error: `Jadwal bentrok: Kelas ini sudah memiliki pelajaran ${(s.subject as any)?.name || ''} pada rentang ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}.`,
        };
      }
    }

    // 2. Validasi Bentrok Guru (guru yang sama mengajar di kelas lain pada hari & jam yang sama)
    const { data: existingTeacherSchedules } = await supabase
      .from('schedules')
      .select(`
        id, start_time, end_time,
        class:classes!schedules_class_id_fkey(name)
      `)
      .eq('teacher_id', payload.teacherId)
      .eq('day_of_week', payload.dayOfWeek);

    for (const s of existingTeacherSchedules || []) {
      const isOverlap = !(payload.endTime <= s.start_time || payload.startTime >= s.end_time);
      if (isOverlap) {
        return {
          success: false,
          error: `Jadwal bentrok: ${teacherName} sudah mengajar di kelas ${(s.class as any)?.name || 'lain'} pada rentang ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}.`,
        };
      }
    }

    const { error: insertError } = await supabase.from('schedules').insert({
      class_id: payload.classId,
      teaching_id: payload.teachingId,
      subject_id: payload.subjectId,
      teacher_id: payload.teacherId,
      day_of_week: payload.dayOfWeek,
      start_time: payload.startTime,
      end_time: payload.endTime,
    });

    if (insertError) return { success: false, error: insertError.message };

    revalidatePath('/admin/kelas-mapel');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

export async function deleteScheduleAction(scheduleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminCaller();

    const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/kelas-mapel');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal' };
  }
}

