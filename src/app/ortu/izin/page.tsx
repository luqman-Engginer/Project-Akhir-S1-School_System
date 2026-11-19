import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  LeaveHistoryList,
  LeaveHistoryItem,
} from '@/components/academic/LeaveHistoryList';

export default async function OrtuLeaveHistoryPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil ortu
  const { data: parentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!parentProfile) {
    redirect('/login');
  }

  // Ambil anak-anak ortu
  const { data: parentRels } = await supabase
    .from('parent_students')
    .select('student_id')
    .eq('parent_id', parentProfile.id);

  const studentIds = (parentRels || []).map((r) => r.student_id);

  let leaves: LeaveHistoryItem[] = [];

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

    leaves = (leavesData || []).map((item: any) => ({
      id: item.id,
      student_name: item.student?.full_name || 'Anak',
      type: item.type,
      date_from: item.date_from,
      date_to: item.date_to,
      reason: item.reason,
      attachment_path: item.attachment_path,
      status: item.status,
      review_note: item.review_note,
      created_at: item.created_at,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/ortu"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
            Riwayat Surat Izin
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
            Daftar pengajuan izin sakit dan keperluan anak Anda.
          </p>
        </div>

        <Button href="/ortu/izin/baru" variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          <span>Ajukan Izin Baru</span>
        </Button>
      </div>

      <LeaveHistoryList initialLeaves={leaves} createUrl="/ortu/izin/baru" />
    </div>
  );
}
