import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  LeaveHistoryList,
  LeaveHistoryItem,
} from '@/components/academic/LeaveHistoryList';

export default async function MuridLeaveHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil murid
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  // Ambil riwayat izin murid
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
      created_at
    `)
    .eq('student_id', profile.id)
    .order('created_at', { ascending: false });

  const leaves: LeaveHistoryItem[] = (leavesData || []).map((item: any) => ({
    id: item.id,
    student_name: profile.full_name,
    type: item.type,
    date_from: item.date_from,
    date_to: item.date_to,
    reason: item.reason,
    attachment_path: item.attachment_path,
    status: item.status,
    review_note: item.review_note,
    created_at: item.created_at,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/murid/jadwal-nilai"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Jadwal & Kehadiran</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
            Riwayat Surat Izin Saya
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
            Daftar permohonan izin sakit dan keperluan yang pernah kamu ajukan.
          </p>
        </div>

        <Button href="/murid/izin/baru" variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          <span>Ajukan Izin Baru</span>
        </Button>
      </div>

      <LeaveHistoryList initialLeaves={leaves} createUrl="/murid/izin/baru" />
    </div>
  );
}
