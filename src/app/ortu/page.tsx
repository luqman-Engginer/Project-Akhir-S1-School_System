import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  Clock,
  BookOpen,
  Award,
  Megaphone,
  ArrowRight,
  AlertTriangle,
  FileText,
  CheckCircle2,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { ListRow } from '@/components/ui/ListRow';
import { Button } from '@/components/ui/Button';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  getGreetingWIB,
  formatWIB,
  formatRelativeDeadline,
  formatRelativeTime,
} from '@/lib/dates';
import { ParentReminderDialog } from './ParentReminderDialog';
import type { ParentDashboard, ParentDashboardChild } from '@/types/dashboard';

export default async function OrtuHomePage() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil orang tua
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  let dashboardData: ParentDashboard | null = null;
  let rpcError: string | null = null;

  try {
    const { data, error } = await supabase.rpc('dashboard_parent');
    if (error) {
      rpcError = error.message;
    } else {
      dashboardData = data as unknown as ParentDashboard;
    }
  } catch (err: unknown) {
    rpcError = err instanceof Error ? err.message : 'Gagal memuat data orang tua';
  }

  const greeting = getGreetingWIB();
  const parentName = profile?.full_name || 'Bapak/Ibu';
  const todayFormatted = formatWIB(new Date(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const children = dashboardData?.children || [];
  const activeChildCookie = cookieStore.get('active_child_id')?.value;

  // Pilih anak aktif
  let activeChild: ParentDashboardChild | undefined = children.find(
    (c) => c.student_id === activeChildCookie
  );

  if (!activeChild && children.length > 0) {
    activeChild = children[0];
  }

  // Helper pemetaan status kehadiran anak
  const formatAttendanceStatus = (status: string) => {
    switch (status) {
      case 'present':
        return {
          label: 'Hadir di Sekolah',
          sub: 'Tercatat hadir dalam kegiatan belajar mengajar hari ini.',
          badge: 'hadir' as StatusVariant,
          icon: CheckCircle2,
          bgClass: 'bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success-text)]',
        };
      case 'sick':
        return {
          label: 'Sakit',
          sub: 'Tercatat tidak masuk karena sakit.',
          badge: 'sakit' as StatusVariant,
          icon: Clock,
          bgClass: 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)] text-[var(--status-warning-text)]',
        };
      case 'excused':
        return {
          label: 'Izin',
          sub: 'Tercatat izin resmi untuk keperluan keluarga atau lainnya.',
          badge: 'izin' as StatusVariant,
          icon: HelpCircle,
          bgClass: 'bg-[var(--status-info-bg)] border-[var(--status-info-border)] text-[var(--status-info-text)]',
        };
      case 'absent':
        return {
          label: 'Alpa / Tanpa Keterangan',
          sub: 'Belum ada surat izin atau pemberitahuan dari orang tua.',
          badge: 'alpa' as StatusVariant,
          icon: XCircle,
          bgClass: 'bg-[var(--status-danger-bg)] border-[var(--status-danger-border)] text-[var(--status-danger-text)]',
        };
      case 'belum_diabsen':
      default:
        return {
          label: 'Belum Diabsen',
          sub: 'Pencatatan kehadiran kelas sedang berlangsung atau belum dimulai.',
          badge: 'neutral' as StatusVariant,
          icon: Clock,
          bgClass: 'bg-[#F5F1E9] border-[#DDD7CD] text-[#5B676B]',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Salam */}
      <div>
        <div className="text-xs sm:text-sm font-medium text-[var(--color-primary)]">
          {todayFormatted}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)] tracking-tight mt-0.5">
          {greeting}, Bapak/Ibu {parentName}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Pantau perkembangan, kehadiran, dan aktivitas belajar putra/putri Anda.
        </p>
      </div>

      {/* Error alert bila terjadi kendala */}
      {rpcError && (
        <div
          role="alert"
          className="p-4 rounded-[12px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-sm flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Terjadi kendala saat memuat data anak.</p>
            <p className="text-xs opacity-90 mt-0.5">{rpcError}</p>
          </div>
        </div>
      )}

      {/* Ortu tanpa anak tertaut */}
      {children.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="Belum Ada Data Anak yang Tertaut"
          description="Akun kamu belum terhubung ke data anak, hubungi admin sekolah atau bagian tata usaha."
          className="py-12"
        />
      ) : activeChild ? (
        <>
          {/* ============================================================ */}
          {/* 1. ELEMEN UTAMA: KARTU STATUS KEHADIRAN ANAK HARI INI        */}
          {/* ============================================================ */}
          {(() => {
            const statusMeta = formatAttendanceStatus(activeChild.today_status);
            const StatusIcon = statusMeta.icon;

            return (
              <div
                className={`rounded-[16px] border p-5 sm:p-6 transition-all shadow-xs ${statusMeta.bgClass}`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/90 flex items-center justify-center shrink-0 shadow-2xs">
                      <StatusIcon className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                          Kehadiran Hari Ini
                        </span>
                        <StatusBadge status={statusMeta.badge} size="sm" />
                      </div>

                      <h2 className="text-xl sm:text-2xl font-extrabold font-display mt-0.5">
                        {activeChild.name} &bull; {statusMeta.label}
                      </h2>

                      <p className="text-xs sm:text-sm opacity-90 mt-1">
                        Kelas <strong>{activeChild.class_name}</strong> &bull;{' '}
                        {statusMeta.sub}
                      </p>
                    </div>
                  </div>

                  {/* Aksi Cepat Orang Tua */}
                  <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-center shrink-0">
                    <Button
                      href="/ortu/pesan"
                      variant="quiet"
                      size="sm"
                      className="bg-white/70 hover:bg-white text-[var(--color-text)] border border-black/10"
                    >
                      <FileText className="w-4 h-4 mr-1 text-[var(--color-primary)]" />
                      <span>Ajukan Izin</span>
                    </Button>

                    <ParentReminderDialog
                      studentId={activeChild.student_id}
                      studentName={activeChild.name}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ============================================================ */}
          {/* 2. BLOK TUGAS TERLAMBAT / MENDEKATI DEADLINE                 */}
          {/* ============================================================ */}
          <Panel
            title={`Tugas & Pengumpulan (${activeChild.name})`}
            subtitle="Tugas yang terlewat atau mendekati batas waktu pengumpulan"
            action={
              <Link
                href="/ortu/perkembangan"
                className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <span>Lihat perkembangan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {activeChild.late_assignments.length > 0 ||
            activeChild.upcoming_assignments.length > 0 ? (
              <div className="space-y-1">
                {/* Tugas terlambat */}
                {activeChild.late_assignments.map((item) => (
                  <ListRow
                    key={`late-${item.assignment_id}`}
                    leftSlot={
                      <div className="w-9 h-9 rounded-full bg-[#FDF2F2] text-[var(--status-danger-text)] flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    }
                    title={item.title}
                    subtitle={`Batas waktu telah terlewat (${formatRelativeTime(item.deadline)})`}
                    rightSlot={<StatusBadge status="terlambat" size="sm" />}
                    showChevron={false}
                  />
                ))}

                {/* Tugas mendatang */}
                {activeChild.upcoming_assignments.slice(0, 3).map((item) => {
                  const deadlineInfo = formatRelativeDeadline(item.deadline);
                  return (
                    <ListRow
                      key={`up-${item.assignment_id}`}
                      leftSlot={
                        <div className="w-9 h-9 rounded-full bg-[#E8F1EE] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      }
                      title={item.title}
                      subtitle={`Batas pengumpulan: ${deadlineInfo.label}`}
                      rightSlot={
                        deadlineInfo.isUrgent ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]">
                            Segera
                          </span>
                        ) : undefined
                      }
                      showChevron={false}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Semua Tugas Aman!"
                description={`Tidak ada tugas yang terlambat untuk ${activeChild.name}. Semua berjalan dengan tertib.`}
                className="py-8"
              />
            )}
          </Panel>

          {/* ============================================================ */}
          {/* 3. BLOK NILAI TERBARU ANAK                                   */}
          {/* ============================================================ */}
          <Panel
            title={`Nilai Terbaru (${activeChild.name})`}
            subtitle="Nilai hasil pemeriksaan tugas oleh guru"
          >
            {activeChild.latest_grades.length > 0 ? (
              <div className="space-y-1">
                {activeChild.latest_grades.slice(0, 3).map((grade, idx) => (
                  <ListRow
                    key={idx}
                    leftSlot={
                      <div className="w-9 h-9 rounded-full bg-[#E8F1EE] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                    }
                    title={grade.assignment_title}
                    subtitle={`Diperiksa: ${formatRelativeTime(grade.graded_at)}`}
                    rightSlot={
                      <span className="text-base sm:text-lg font-bold text-[var(--color-primary)]">
                        {grade.score}
                      </span>
                    }
                    showChevron={false}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Award}
                title="Belum Ada Nilai Tugas Baru"
                description={`Nilai tugas ${activeChild.name} yang telah diperiksa akan muncul di sini.`}
                className="py-8"
              />
            )}
          </Panel>

          {/* ============================================================ */}
          {/* 4. BLOK PENGUMUMAN SEKOLAH                                   */}
          {/* ============================================================ */}
          <Panel
            title="Pengumuman Sekolah"
            subtitle="Surat edaran dan informasi resmi dari pihak SMK"
            action={
              <Link
                href="/ortu/pengumuman"
                className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <span>Semua pengumuman</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {dashboardData && dashboardData.announcements.length > 0 ? (
              <div className="space-y-1">
                {dashboardData.announcements.slice(0, 3).map((item) => (
                  <ListRow
                    key={item.id}
                    href="/ortu/pengumuman"
                    leftSlot={
                      <div className="w-9 h-9 rounded-full bg-[#FAF0E6] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                        <Megaphone className="w-4 h-4" />
                      </div>
                    }
                    title={
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.title}</span>
                        {item.is_pinned && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-white">
                            Penting
                          </span>
                        )}
                      </div>
                    }
                    subtitle={
                      <span className="line-clamp-1 text-xs text-[var(--color-text-muted)]">
                        {item.body}
                      </span>
                    }
                    rightSlot={
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Megaphone}
                title="Belum Ada Pengumuman Baru"
                description="Informasi dan surat edaran resmi akan tampil di sini bila ada."
                className="py-8"
              />
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
