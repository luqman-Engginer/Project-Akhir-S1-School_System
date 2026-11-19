import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText, Calendar, Clock, Award, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { ListRow } from '@/components/ui/ListRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { AttendanceHistory } from '@/components/academic/AttendanceHistory';
import { formatTimeSpan, formatDateTimeWIB } from '@/lib/dates';
import type { ParentChildSummary } from '@/types/dashboard';

export default async function MuridJadwalNilaiPage() {
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
    .select(`
      id,
      full_name,
      student_classes(class_id, class:classes(name))
    `)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  const classId = (profile as any).student_classes?.[0]?.class_id;
  const className = (profile as any).student_classes?.[0]?.class?.name || '';

  // Ambil rekap kehadiran & ringkasan via parent_child_summary
  let summary: ParentChildSummary | null = null;
  try {
    const { data } = await supabase.rpc('parent_child_summary', {
      p_student_id: profile.id,
    });
    if (data) {
      summary = data as unknown as ParentChildSummary;
    }
  } catch {
    // Ignore
  }

  // Ambil jadwal mingguan kelas
  let schedules: any[] = [];
  if (classId) {
    const { data: schData } = await supabase
      .from('schedules')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        subject:subjects!schedules_subject_id_fkey(name),
        teacher:profiles!schedules_teacher_id_fkey(full_name)
      `)
      .eq('class_id', classId)
      .order('day_of_week')
      .order('start_time');

    schedules = schData || [];
  }

  // Ambil data nilai detail murid (submissions yang berstatus graded)
  const { data: gradedSubmissions } = await supabase
    .from('submissions')
    .select(`
      id,
      score,
      feedback,
      graded_at,
      assignment:assignments!submissions_assignment_id_fkey(
        id,
        title,
        teaching:teachings(
          subject:subjects(name)
        )
      )
    `)
    .eq('student_id', profile.id)
    .eq('status', 'graded')
    .order('graded_at', { ascending: false });

  const recentAttendance = (summary?.recent_attendance || []).map((r) => ({
    date: r.date,
    status: r.status,
    note: r.note,
  }));

  const totalDays = recentAttendance.length || 1;
  const daysPresent = recentAttendance.filter((r) => r.status === 'present').length;
  const attendancePercent =
    summary?.attendance_percent_30d ?? Math.round((daysPresent / totalDays) * 100);

  const dayNames = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  // Kelompokkan jadwal per hari (Senin = 1 s/d Jumat = 5)
  const schedulesByDay: { [key: number]: any[] } = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };

  (schedules || []).forEach((sch) => {
    if (schedulesByDay[sch.day_of_week]) {
      schedulesByDay[sch.day_of_week].push(sch);
    }
  });

  const subjectAverages = summary?.average_by_subject || [];

  return (
    <div className="space-y-8">
      {/* Header & Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
            Jadwal Pelajaran & Nilai
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
            Informasi kelas <strong>{className}</strong>, jadwal mingguan, catatan absensi, dan nilai akademik Anda.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button href="/murid/izin" variant="secondary" size="sm">
            <FileText className="w-4 h-4 mr-1.5" />
            <span>Riwayat Izin</span>
          </Button>

          <Button href="/murid/izin/baru" variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Ajukan Izin</span>
          </Button>
        </div>
      </div>

      {/* Bagian 1: Rangkuman Nilai & Evaluasi Tugas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-display text-[var(--color-text)]">
              Rangkuman Nilai Akademik
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Rata-rata nilai per mata pelajaran dan catatan umpan balik bapak/ibu guru.
            </p>
          </div>
          <Button href="/murid/tugas" variant="secondary" size="sm">
            <BookOpen className="w-4 h-4 mr-1.5" />
            <span>Semua Tugas</span>
          </Button>
        </div>

        {/* Kartu Rata-Rata per Mata Pelajaran */}
        {subjectAverages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {subjectAverages.map((sub, idx) => (
              <div
                key={idx}
                className="p-4 rounded-[12px] bg-white border border-[var(--color-border)] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1">
                    Mata Pelajaran
                  </span>
                  <h3 className="text-sm font-bold text-[var(--color-text)] line-clamp-1">
                    {sub.subject_name}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-baseline justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">Rata-rata Nilai:</span>
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
            Belum ada tugas yang dinilai untuk menghitung rata-rata nilai mata pelajaran.
          </div>
        )}

        {/* Daftar Tugas yang Telah Dinilai */}
        <Panel
          title="Tugas yang Telah Dinilai"
          subtitle="Daftar nilai tugas terbaru yang telah diperiksa"
        >
          {gradedSubmissions && gradedSubmissions.length > 0 ? (
            <div className="space-y-3">
              {gradedSubmissions.map((sub: any) => {
                const asg = sub.assignment;
                const subjName = asg?.teaching?.subject?.name || 'Mata Pelajaran';

                return (
                  <div
                    key={sub.id}
                    className="p-3.5 sm:p-4 rounded-[10px] bg-[#FAF7F2] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white text-[var(--color-text-muted)] border border-[var(--color-border)]">
                          {subjName}
                        </span>
                        {sub.graded_at && (
                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            Dinilai {formatDateTimeWIB(sub.graded_at)}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-[var(--color-text)]">
                        {asg?.title || 'Tugas'}
                      </h4>

                      {sub.feedback && (
                        <p className="text-xs text-[var(--color-text-muted)] italic">
                          Catatan Guru: &ldquo;{sub.feedback}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]">
                      <div className="text-right">
                        <span className="text-[11px] text-[var(--color-text-muted)] block">Nilai</span>
                        <span className="text-2xl font-bold font-display text-[var(--color-primary)]">
                          {sub.score ?? 0}
                          <span className="text-xs font-normal text-[var(--color-text-muted)]">/100</span>
                        </span>
                      </div>

                      {asg?.id && (
                        <Button href={`/murid/tugas/${asg.id}`} variant="secondary" size="sm">
                          Lihat Detail
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
              Belum ada tugas yang dinilai oleh bapak/ibu guru.
            </div>
          )}
        </Panel>
      </section>

      {/* Bagian 2: Kehadiran Saya */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-display text-[var(--color-text)]">
          Catatan Kehadiran Saya
        </h2>
        <AttendanceHistory
          title="Kehadiran Saya"
          studentName={profile.full_name}
          attendancePercent={attendancePercent}
          daysPresent={daysPresent}
          totalSchoolDays={totalDays}
          recentAttendance={recentAttendance}
        />
      </section>

      {/* Bagian 3: Jadwal Pelajaran Mingguan per Hari */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold font-display text-[var(--color-text)]">
            Jadwal Mingguan Kelas {className}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Sesi tatap muka pelajaran dari hari Senin hingga Jumat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((dayNum) => {
            const daySchedules = schedulesByDay[dayNum] || [];

            return (
              <div
                key={dayNum}
                className="p-4 rounded-[12px] bg-white border border-[var(--color-border)] shadow-sm flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5 mb-3">
                  <h3 className="font-bold font-display text-base text-[var(--color-text)]">
                    {dayNames[dayNum]}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                    {daySchedules.length} Sesi
                  </span>
                </div>

                {daySchedules.length > 0 ? (
                  <div className="space-y-2.5 flex-1">
                    {daySchedules.map((sch) => (
                      <div
                        key={sch.id}
                        className="p-2.5 rounded-[8px] bg-[#FAF7F2] border border-[var(--color-border)] text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between font-semibold text-[var(--color-text)]">
                          <span>{sch.subject?.name || 'Mata Pelajaran'}</span>
                          <span className="text-[11px] text-[var(--color-primary)] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            {formatTimeSpan(sch.start_time, sch.end_time)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">
                          Pengampu: {sch.teacher?.full_name || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[var(--color-text-muted)] italic flex-1 flex items-center justify-center">
                    Tidak ada jadwal pelajaran
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
