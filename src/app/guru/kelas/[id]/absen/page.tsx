import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { todayWIB } from '@/lib/dates';
import { AttendanceForm, RosterStudent } from './AttendanceForm';

interface AbsenPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function GuruAbsenFastPage({
  params,
  searchParams,
}: AbsenPageProps) {
  const { id: classId } = await params;
  const { date } = await searchParams;

  const selectedDate = date || todayWIB();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ambil detail kelas
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, name, academic_year')
    .eq('id', classId)
    .maybeSingle();

  if (classError || !classData) {
    notFound();
  }

  // Panggil RPC teacher_class_roster
  let rawRoster: any[] = [];
  try {
    const { data: rosterData, error: rosterError } = await supabase.rpc(
      'teacher_class_roster',
      {
        p_class_id: classId,
        p_date: selectedDate,
      }
    );

    if (rosterError) {
      throw rosterError;
    }

    rawRoster = Array.isArray(rosterData) ? rosterData : [];
  } catch (err: unknown) {
    // Jika akses ditolak atau gagal, kembalikan ke detail kelas
    redirect(`/guru/kelas/${classId}`);
  }

  // Ambil permohonan izin yang disetujui untuk tanggal ini
  const { data: approvedLeaves } = await supabase
    .from('leave_requests')
    .select('student_id, type, reason')
    .eq('status', 'approved')
    .lte('date_from', selectedDate)
    .gte('date_to', selectedDate);

  const approvedMap = new Map<string, { type: 'sick' | 'excused'; reason: string }>();
  (approvedLeaves || []).forEach((al) => {
    approvedMap.set(al.student_id, {
      type: al.type,
      reason: al.reason,
    });
  });

  // Ambil nomor telepon ortu dari parent_students
  const studentIds = rawRoster.map((r) => r.student_id);
  const { data: parentRelations } = await supabase
    .from('parent_students')
    .select(`
      student_id,
      parent:profiles!parent_students_parent_id_fkey(full_name, phone)
    `)
    .in('student_id', studentIds);

  const parentMap = new Map<string, { name: string; phone: string | null }>();
  (parentRelations || []).forEach((rel: any) => {
    if (rel.parent) {
      parentMap.set(rel.student_id, {
        name: rel.parent.full_name,
        phone: rel.parent.phone,
      });
    }
  });

  // Susun data final roster murid
  const formattedRoster: RosterStudent[] = rawRoster.map((item) => {
    const approvedLeave = approvedMap.get(item.student_id);
    const parentInfo = parentMap.get(item.student_id);

    let status = item.status || 'present';
    let note = item.note;

    // Jika ada izin resmi yang disetujui dan belum ada absensi tercatat
    if (approvedLeave && (!item.status || item.status === 'present')) {
      status = approvedLeave.type === 'sick' ? 'sick' : 'excused';
      note = approvedLeave.reason;
    }

    return {
      student_id: item.student_id,
      student_name: item.student_name,
      status: status as any,
      note,
      parent_phone: parentInfo?.phone || null,
      parent_name: parentInfo?.name || null,
      approved_leave: approvedLeave || null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/guru/kelas/${classId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Detail Kelas</span>
        </Link>
      </div>

      <div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F1EE] text-[var(--color-primary)]">
          Pencatatan Cepat 1 Menit
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)] mt-1">
          Form Absensi Kelas {classData.name}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
          Semua siswa otomatis berstatus <strong>Hadir</strong>. Cukup ubah siswa yang berhalangan atau sakit.
        </p>
      </div>

      <AttendanceForm
        classId={classId}
        className={classData.name}
        selectedDate={selectedDate}
        initialRoster={formattedRoster}
      />
    </div>
  );
}
