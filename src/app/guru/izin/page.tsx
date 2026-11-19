import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import {
  HomeroomLeaveReviewList,
  HomeroomLeaveItem,
} from './HomeroomLeaveReviewList';

export default async function GuruIzinHomeroomPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil guru
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, is_homeroom')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  // Guard: Hanya wali kelas yang boleh membuka halaman ini
  if (!profile || !profile.is_homeroom) {
    redirect('/guru');
  }

  // Ambil kelas yang dibina oleh guru ini (sebagai homeroom_teacher_id)
  const { data: homeroomClass } = await supabase
    .from('classes')
    .select('id, name')
    .eq('homeroom_teacher_id', profile.id)
    .maybeSingle();

  if (!homeroomClass) {
    redirect('/guru');
  }

  // Ambil murid di kelas binaan
  const { data: studentRels } = await supabase
    .from('student_classes')
    .select('student_id')
    .eq('class_id', homeroomClass.id);

  const studentIds = (studentRels || []).map((s) => s.student_id);

  let pendingLeaves: HomeroomLeaveItem[] = [];
  let historyLeaves: HomeroomLeaveItem[] = [];

  if (studentIds.length > 0) {
    const { data: leavesData } = await supabase
      .from('leave_requests')
      .select(`
        id,
        student_id,
        type,
        date_from,
        date_to,
        reason,
        attachment_path,
        status,
        review_note,
        created_at,
        student:profiles!leave_requests_student_id_fkey(full_name)
      `)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false });

    (leavesData || []).forEach((item: any) => {
      const formatted: HomeroomLeaveItem = {
        id: item.id,
        student_name: item.student?.full_name || 'Murid',
        type: item.type,
        date_from: item.date_from,
        date_to: item.date_to,
        reason: item.reason,
        attachment_path: item.attachment_path,
        status: item.status,
        review_note: item.review_note,
        created_at: item.created_at,
      };

      if (item.status === 'pending') {
        pendingLeaves.push(formatted);
      } else {
        historyLeaves.push(formatted);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/guru"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda Guru</span>
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF0E6] text-[var(--color-accent)] border border-[#F5D8C7]">
            Khusus Wali Kelas {homeroomClass.name}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)] mt-1">
          Persetujuan Surat Izin Murid
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
          Tinjau surat izin sakit atau permohonan tidak masuk dari siswa binaan kelas Anda.
        </p>
      </div>

      <HomeroomLeaveReviewList
        pendingLeaves={pendingLeaves}
        historyLeaves={historyLeaves}
      />
    </div>
  );
}
