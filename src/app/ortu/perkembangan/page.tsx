import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, Plus, HelpCircle, Sparkles, BookOpen, Award } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import { AttendanceHistory } from '@/components/academic/AttendanceHistory';
import { ParentTasksSection } from './ParentTasksSection';
import type { ParentChildSummary } from '@/types/dashboard';

export default async function OrtuPerkembanganPage() {
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

  // Ambil data anak-anak
  const { data: studentRels } = await supabase
    .from('parent_students')
    .select(`
      student:profiles!parent_students_student_id_fkey(
        id,
        full_name,
        student_classes(
          class:classes(name)
        )
      )
    `)
    .eq('parent_id', parentProfile.id);

  const children = (studentRels || [])
    .map((r: any) => ({
      id: r.student?.id,
      name: r.student?.full_name || 'Anak',
      className: r.student?.student_classes?.[0]?.class?.name,
    }))
    .filter((c) => Boolean(c.id));

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={HelpCircle}
          title="Belum Ada Data Anak"
          description="Akun Anda belum terhubung dengan data siswa di sistem Sekolahku."
          actionLabel="Kembali ke Beranda"
          actionHref="/ortu"
        />
      </div>
    );
  }

  const activeChildCookie = cookieStore.get('active_child_id')?.value;
  let activeChild = children.find((c) => c.id === activeChildCookie);
  if (!activeChild) {
    activeChild = children[0];
  }

  // Panggil RPC parent_child_summary
  let summary: ParentChildSummary | null = null;
  try {
    const { data, error } = await supabase.rpc('parent_child_summary', {
      p_student_id: activeChild.id,
    });
    if (!error && data) {
      summary = data as unknown as ParentChildSummary;
    }
  } catch {
    // Ignore
  }

  const recentAttendance = (summary?.recent_attendance || []).map((r) => ({
    date: r.date,
    status: r.status,
    note: r.note,
  }));

  const totalDays = recentAttendance.length || 1;
  const daysPresent = recentAttendance.filter((r) => r.status === 'present').length;
  const attendancePercent =
    summary?.attendance_percent_30d ?? Math.round((daysPresent / totalDays) * 100);

  // Analisis ringkasan tugas & nilai
  const assignments = summary?.assignments || [];
  const overdueTasks = assignments.filter(
    (a) => a.status === 'overdue_not_submitted' || a.status === 'late'
  );
  const subjectAverages = summary?.average_by_subject || [];

  let overallAverage: number | null = null;
  if (subjectAverages.length > 0) {
    const total = subjectAverages.reduce((acc, curr) => acc + (curr.average_score || 0), 0);
    overallAverage = Math.round((total / subjectAverages.length) * 10) / 10;
  }

  // Kalimat ringkasan dinamis satu kalimat
  let summarySentence = `${activeChild.name} memiliki tingkat kehadiran ${attendancePercent}% dalam 30 hari terakhir.`;
  if (overdueTasks.length > 0 && overallAverage !== null) {
    summarySentence = `${activeChild.name} hadir ${attendancePercent}% bulan ini, ada ${overdueTasks.length} tugas yang perlu perhatian dan rata-rata nilai akademik ${overallAverage}.`;
  } else if (overdueTasks.length === 0 && overallAverage !== null) {
    summarySentence = `${activeChild.name} hadir ${attendancePercent}% bulan ini, seluruh tugas telah dikumpulkan dengan baik dan rata-rata nilai akademik ${overallAverage}.`;
  } else if (overdueTasks.length > 0) {
    summarySentence = `${activeChild.name} hadir ${attendancePercent}% bulan ini dan ada ${overdueTasks.length} tugas yang memerlukan perhatian.`;
  }

  return (
    <div className="space-y-8">
      {/* Header & Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
            Perkembangan & Kehadiran
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
            Memantau ananda <strong>{activeChild.name}</strong>{' '}
            {activeChild.className ? `(${activeChild.className})` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button href="/ortu/izin" variant="secondary" size="sm">
            <FileText className="w-4 h-4 mr-1.5" />
            <span>Riwayat Izin</span>
          </Button>

          <Button href="/ortu/izin/baru" variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Ajukan Izin</span>
          </Button>
        </div>
      </div>

      {/* Kartu Ringkasan Dinamis Satu Kalimat */}
      <div className="p-4 sm:p-5 rounded-[14px] bg-gradient-to-r from-[#FAF7F2] to-[#F4EFEA] border border-[var(--color-border)] shadow-sm flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            Ringkasan Perkembangan Belajar
          </h2>
          <p className="text-sm sm:text-base font-semibold text-[var(--color-text)] leading-snug">
            {summarySentence}
          </p>
        </div>
      </div>

      {/* Bagian 1: Tugas Sekolah Ananda */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-bold font-display text-[var(--color-text)]">
            Tugas Sekolah Ananda
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Status pengumpulan tugas dari guru kelas. Anda dapat mengirimkan pesan pengingat ramah untuk tugas yang belum selesai.
          </p>
        </div>

        <ParentTasksSection
          studentId={activeChild.id}
          studentName={activeChild.name}
          tasks={assignments}
        />
      </section>

      {/* Bagian 2: Nilai per Mata Pelajaran */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-bold font-display text-[var(--color-text)]">
            Rata-rata Nilai per Mata Pelajaran
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Capaian nilai evaluasi tugas ananda sepanjang semester ini.
          </p>
        </div>

        {subjectAverages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {subjectAverages.map((sub, idx) => (
              <div
                key={idx}
                className="p-4 rounded-[12px] bg-white border border-[var(--color-border)] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block mb-1">
                    Mata Pelajaran
                  </span>
                  <h4 className="text-sm font-bold text-[var(--color-text)] line-clamp-1">
                    {sub.subject_name}
                  </h4>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-baseline justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">Rata-rata:</span>
                  <span className="text-2xl font-bold font-display text-[var(--color-primary)]">
                    {sub.average_score}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">/100</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 rounded-[12px] bg-white border border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
            Belum ada nilai tugas yang dirilis oleh bapak/ibu guru untuk ananda.
          </div>
        )}
      </section>

      {/* Bagian 3: Rekap Kehadiran */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-bold font-display text-[var(--color-text)]">
            Rekap Kehadiran 30 Hari Terakhir
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Catatan kehadiran tatap muka ananda di sekolah.
          </p>
        </div>

        <AttendanceHistory
          title={`Rekap Kehadiran ${activeChild.name}`}
          studentName={activeChild.name}
          attendancePercent={attendancePercent}
          daysPresent={daysPresent}
          totalSchoolDays={totalDays}
          recentAttendance={recentAttendance}
        />
      </section>
    </div>
  );
}
