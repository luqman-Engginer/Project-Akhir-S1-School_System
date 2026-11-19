import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { ListRow } from '@/components/ui/ListRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { todayWIB } from '@/lib/dates';

export default async function GuruKelasListPage() {
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

  if (!profile) {
    redirect('/login');
  }

  const today = todayWIB();

  // Ambil kelas yang diajar guru dari tabel teachings
  const { data: teachingsData } = await supabase
    .from('teachings')
    .select(`
      id,
      class:classes!teachings_class_id_fkey(
        id,
        name,
        academic_year,
        homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(full_name)
      ),
      subject:subjects!teachings_subject_id_fkey(
        id,
        name
      )
    `)
    .eq('teacher_id', profile.id);

  // Ambil data murid per kelas & status absensi hari ini
  const classItems = await Promise.all(
    (teachingsData || []).map(async (t: any) => {
      const classId = t.class?.id;

      // Jumlah murid
      const { count: studentCount } = await supabase
        .from('student_classes')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId);

      // Cek apakah ada absensi tercatat hari ini
      const { data: attToday } = await supabase
        .from('attendance')
        .select('id')
        .eq('class_id', classId)
        .eq('date', today)
        .limit(1);

      const isRecordedToday = Boolean(attToday && attToday.length > 0);

      return {
        classId,
        className: t.class?.name || 'Kelas',
        academicYear: t.class?.academic_year || '',
        subjectName: t.subject?.name || 'Mata Pelajaran',
        studentCount: studentCount || 0,
        isRecordedToday,
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[var(--color-text)]">
            Kelas & Mata Pelajaran
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Pilih kelas untuk mencatat absensi harian atau mengelola tugas siswa.
          </p>
        </div>

        {/* Tautan Wali Kelas jika is_homeroom */}
        {profile.is_homeroom && (
          <Button href="/guru/izin" variant="secondary" size="sm">
            <Clock className="w-4 h-4 mr-1.5 text-[var(--color-accent)]" />
            <span>Persetujuan Izin Binaan</span>
          </Button>
        )}
      </div>

      {/* Daftar Kelas */}
      <Panel
        title="Daftar Kelas yang Anda Ajar"
        subtitle={`Total ${classItems.length} rombel aktif`}
      >
        {classItems.length > 0 ? (
          <div className="space-y-1">
            {classItems.map((cls) => (
              <ListRow
                key={cls.classId}
                href={`/guru/kelas/${cls.classId}`}
                leftSlot={
                  <div className="w-10 h-10 rounded-full bg-[#E8F1EE] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                }
                title={
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{cls.className}</span>
                    <span className="text-xs text-[var(--color-text-muted)] font-normal">
                      &bull; {cls.subjectName}
                    </span>
                  </div>
                }
                subtitle={`${cls.studentCount} siswa terdaftar &bull; TA ${cls.academicYear}`}
                rightSlot={
                  <div className="flex items-center gap-3">
                    {cls.isRecordedToday ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sudah Diabsen</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Belum Diabsen</span>
                      </span>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={GraduationCap}
            title="Belum Ada Penugasan Kelas"
            description="Anda belum terdaftar mengajar di kelas manapun. Hubungi admin kurikulum sekolah untuk alokasi mapel."
            actionLabel="Kembali ke Beranda"
            actionHref="/guru"
          />
        )}
      </Panel>
    </div>
  );
}
