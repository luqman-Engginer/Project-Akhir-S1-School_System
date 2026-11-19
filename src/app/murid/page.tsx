import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  Award,
  MessageSquare,
  Clock,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Megaphone,
} from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { ListRow } from '@/components/ui/ListRow';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  getGreetingWIB,
  formatWIB,
  formatRelativeDeadline,
  formatTimeSpan,
  formatRelativeTime,
} from '@/lib/dates';
import { getAnnouncementsForUser } from '@/lib/server/announcementData';
import type { StudentDashboard } from '@/types/dashboard';

export default async function MuridHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ambil profil murid
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const announcements = profile?.id
    ? await getAnnouncementsForUser(supabase, profile.id)
    : [];

  // Panggil RPC dashboard_student
  let dashboardData: StudentDashboard | null = null;
  let rpcError: string | null = null;

  try {
    const { data, error } = await supabase.rpc('dashboard_student');
    if (error) {
      rpcError = error.message;
    } else {
      dashboardData = data as unknown as StudentDashboard;
    }
  } catch (err: unknown) {
    rpcError = err instanceof Error ? err.message : 'Gagal memuat data';
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Murid';
  const greeting = getGreetingWIB();
  const todayFormatted = formatWIB(new Date(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const mapStatusToVariant = (status: string): StatusVariant => {
    switch (status) {
      case 'submitted':
        return 'dikumpulkan';
      case 'graded':
        return 'dinilai';
      case 'late':
        return 'terlambat';
      case 'overdue_not_submitted':
        return 'alpa';
      case 'not_submitted':
      default:
        return 'belum dikumpulkan';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Salam Personal */}
      <div>
        <div className="text-xs sm:text-sm font-medium text-[var(--color-primary)]">
          {todayFormatted}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)] tracking-tight mt-0.5">
          {greeting}, {firstName}!
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Berikut rangkuman kegiatan belajar dan tugas sekolahmu hari ini.
        </p>
      </div>

      {/* Tampilan Error Ramah (Jika Terjadi Gangguan) */}
      {rpcError && (
        <div
          role="alert"
          className="p-4 rounded-[12px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-sm flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Tidak dapat memuat ringkasan hari ini.</p>
            <p className="text-xs opacity-90 mt-0.5">{rpcError}</p>
          </div>
        </div>
      )}

      {/* Ringkasan Pesan Cepat (Banner Ringkas) */}
      {dashboardData && dashboardData.unread_messages > 0 && (
        <Link
          href="/murid/pesan"
          className="flex items-center justify-between p-3.5 rounded-[12px] bg-[#EBF2F7] border border-[#D0E0EC] text-[#2C496A] hover:bg-[#E2EDF5] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <MessageSquare className="w-4 h-4 text-[#3D5A80]" />
            <span className="text-sm font-medium">
              Kamu memiliki <strong>{dashboardData.unread_messages} pesan baru</strong> dari guru atau wali kelas.
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#3D5A80] shrink-0" />
        </Link>
      )}

      {/* ============================================================ */}
      {/* 1. ELEMEN UTAMA: TUGAS YANG PERLU DIKERJAKAN                 */}
      {/* ============================================================ */}
      <Panel
        title="Tugas yang Perlu Dikerjakan"
        subtitle="Maksimal 5 tugas terdekat yang menunggu pengumpulan"
        action={
          <Link
            href="/murid/tugas"
            className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <span>Semua tugas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {dashboardData && dashboardData.upcoming_assignments.length > 0 ? (
          <div className="space-y-1">
            {dashboardData.upcoming_assignments.slice(0, 5).map((item) => {
              const deadlineInfo = formatRelativeDeadline(item.deadline);
              const statusVariant = mapStatusToVariant(item.status);

              return (
                <ListRow
                  key={item.assignment_id}
                  href={`/murid/tugas/${item.assignment_id}`}
                  leftSlot={
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        deadlineInfo.isUrgent
                          ? 'bg-[#FAF0E6] text-[var(--color-accent)]'
                          : 'bg-[#E8F1EE] text-[var(--color-primary)]'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                    </div>
                  }
                  title={
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base">
                        {item.title}
                      </span>
                      {deadlineInfo.isUrgent && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]">
                          Segera
                        </span>
                      )}
                    </div>
                  }
                  subtitle={
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-text-muted)] flex-wrap mt-0.5">
                      <span>{item.subject_name}</span>
                      <span>&bull;</span>
                      <span>{item.teacher_name}</span>
                      <span>&bull;</span>
                      <span className={deadlineInfo.isUrgent ? 'font-semibold text-[var(--color-accent)]' : ''}>
                        Batas: {deadlineInfo.label}
                      </span>
                    </div>
                  }
                  rightSlot={<StatusBadge status={statusVariant} size="sm" />}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Belum Ada Tugas yang Menunggu!"
            description="Semua tugasmu sudah selesai dikerjakan atau guru belum memberikan tugas baru. Santai dulu sejenak."
            className="py-8"
          />
        )}
      </Panel>

      {/* ============================================================ */}
      {/* 2. BLOK JADWAL HARI INI                                      */}
      {/* ============================================================ */}
      <Panel
        title="Jadwal Pelajaran Hari Ini"
        subtitle={`Sesi kegiatan belajar mengajar (${todayFormatted})`}
        action={
          <Link
            href="/murid/jadwal-nilai"
            className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <span>Jadwal mingguan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {dashboardData && dashboardData.today_schedule.length > 0 ? (
          <div className="space-y-1">
            {dashboardData.today_schedule.map((schedule) => (
              <ListRow
                key={schedule.schedule_id}
                leftSlot={
                  <div className="w-9 h-9 rounded-full bg-[#F3EFEA] text-[#7A4B3A] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                }
                title={schedule.subject_name}
                subtitle={`Pengampu: ${schedule.teacher_name}`}
                rightSlot={
                  <span className="font-semibold text-xs sm:text-sm text-[var(--color-text)] bg-[#F5F1E9] px-2.5 py-1 rounded-[6px]">
                    {formatTimeSpan(schedule.start_time, schedule.end_time)}
                  </span>
                }
                showChevron={false}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="Tidak Ada Pelajaran Hari Ini"
            description="Tidak ada jadwal tatap muka mata pelajaran yang terjadwal untuk hari ini."
            className="py-8"
          />
        )}
      </Panel>

      {/* ============================================================ */}
      {/* 3. BLOK NILAI TERBARU                                        */}
      {/* ============================================================ */}
      <Panel
        title="Nilai Terbaru"
        subtitle="Hasil evaluasi tugas yang telah diperiksa oleh guru"
        action={
          <Link
            href="/murid/jadwal-nilai"
            className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <span>Semua nilai</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {dashboardData && dashboardData.latest_grades.length > 0 ? (
          <div className="space-y-1">
            {dashboardData.latest_grades.slice(0, 3).map((grade) => (
              <ListRow
                key={grade.submission_id}
                leftSlot={
                  <div className="w-9 h-9 rounded-full bg-[#E8F1EE] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                }
                title={grade.assignment_title}
                subtitle={
                  <div className="text-xs text-[var(--color-text-muted)]">
                    <span>{grade.subject_name}</span>
                    {grade.feedback && (
                      <span className="italic block mt-0.5 text-[11px] text-[var(--color-text)]">
                        &ldquo;{grade.feedback}&rdquo;
                      </span>
                    )}
                  </div>
                }
                rightSlot={
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-bold text-[var(--color-primary)]">
                      {grade.score}
                    </span>
                    <span className="block text-[10px] text-[var(--color-text-muted)]">
                      {formatRelativeTime(grade.graded_at)}
                    </span>
                  </div>
                }
                showChevron={false}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="Belum Ada Nilai Baru"
            description="Nilai dan catatan penilaian dari bapak/ibu guru akan tampil di sini begitu selesai diperiksa."
            className="py-8"
          />
        )}
      </Panel>

      {/* ============================================================ */}
      {/* 4. BLOK PENGUMUMAN SEKOLAH TERBARU                           */}
      {/* ============================================================ */}
      <Panel
        title="Pengumuman Sekolah"
        subtitle="Informasi resmi dan agenda kegiatan terbaru"
        action={
          <Link
            href="/murid/pengumuman"
            className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <span>Lihat semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {announcements && announcements.length > 0 ? (
          <div className="space-y-1">
            {announcements.slice(0, 3).map((ann) => (
              <ListRow
                key={ann.id}
                href={`/murid/pengumuman/${ann.id}`}
                leftSlot={
                  <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
                    <Megaphone className="w-4 h-4" />
                  </div>
                }
                title={ann.title}
                subtitle={ann.body}
                rightSlot={
                  <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
                    {formatRelativeTime(ann.created_at)}
                  </span>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Megaphone}
            title="Belum Ada Pengumuman Baru"
            description="Agenda dan surat edaran sekolah akan muncul di sini."
            className="py-6"
          />
        )}
      </Panel>
    </div>
  );
}
