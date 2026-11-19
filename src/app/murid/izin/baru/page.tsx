import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  LeaveRequestForm,
  LeaveStudentOption,
} from '@/components/academic/LeaveRequestForm';

export default async function MuridNewLeavePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil murid beserta kelas & wali kelas
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      student_classes(
        class:classes(
          name,
          homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(full_name, phone)
        )
      )
    `)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  const cls = (profile as any).student_classes?.[0]?.class;
  const students: LeaveStudentOption[] = [
    {
      id: profile.id,
      name: profile.full_name,
      className: cls?.name,
    },
  ];

  const homeroomPhone = cls?.homeroom_teacher?.phone || null;
  const homeroomName = cls?.homeroom_teacher?.full_name || null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/murid/izin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat Izin</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Ajukan Surat Izin Tidak Masuk
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
          Kirimkan surat keterangan sakit atau izin kepada wali kelas.
        </p>
      </div>

      <LeaveRequestForm
        students={students}
        defaultStudentId={profile.id}
        historyUrl="/murid/izin"
        homeroomPhone={homeroomPhone}
        homeroomName={homeroomName}
      />
    </div>
  );
}
