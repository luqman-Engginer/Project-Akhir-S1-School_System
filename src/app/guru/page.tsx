import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardCheck,
  CheckCircle2,
  FileCheck,
  MessageSquare,
  Clock,
  ArrowRight,
  AlertTriangle,
  Calendar,
  Users,
} from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { ListRow } from '@/components/ui/ListRow';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  getGreetingWIB,
  formatWIB,
  formatTimeSpan,
  formatRelativeTime,
} from '@/lib/dates';
import { TeacherLeaveItem } from './TeacherLeaveItem';
import type { TeacherDashboard } from '@/types/dashboard';

export default async function GuruHomePage() {
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
    .select('full_name, is_homeroom')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  let dashboardData: TeacherDashboard | null = null;
  let rpcError: string | null = null;

  try {
    const { data, error } = await supabase.rpc('dashboard_teacher');
    if (error) {
      rpcError = error.message;
    } else {
      dashboardData = data as unknown as TeacherDashboard;
    }
  } catch (err: unknown) {
    rpcError = err instanceof Error ? err.message : 'Gagal memuat dashboard guru';
  }

  const greeting = getGreetingWIB();
  const fullName = profile?.full_name || 'Bapak/Ibu Guru';
  const todayFormatted = formatWIB(new Date(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Evaluasi status absensi hari ini
  const attendanceToday = dashboardData?.attendance_today || [];
  const unrecordedClasses = attendanceToday.filter((c) => !c.is_recorded);
  const isAllAttendanceDone =
    attendanceToday.length > 0 && unrecordedClasses.length === 0;

  return (
    <div className="space-y-6">
      {/* Header Salam */}
      <div>
        <div className="text-xs sm:text-sm font-medium text-[var(--color-primary)]">
          {todayFormatted}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)] tracking-tight mt-0.5">
          {greeting}, {fullName}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {profile?.is_homeroom
            ? 'Wali Kelas & Guru Pengampu SMK Sekolahku.'
            : 'Guru Pengampu Mata Pelajaran SMK Sekolahku.'}
        </p>
      </div>

      {/* Error alert bila terjadi masalah */}
      {rpcError && (
        <div
          role="alert"
          className="p-4 rounded-[12px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-sm flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Terjadi kendala saat memuat data guru.</p>
            <p className="text-xs opacity-90 mt-0.5">{rpcError}</p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. ELEMEN UTAMA: KARTU ABSEN HARI INI                         */}
      {/* ============================================================ */}
      {unrecordedClasses.length > 0 ? (
        <div className="rounded-[16px] border border-[var(--color-primary)]/20 bg-gradient-to-br from-white to-[#F2F7F5] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-xs">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                  Absensi Hari Ini
                </span>
                <h2 className="text-lg sm:text-xl font-bold font-display text-[var(--color-text)] mt-0.5">
                  Ada {unrecordedClasses.length} kelas yang belum diabsen
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                  Kelas:{' '}
                  <strong>
                    {unrecordedClasses.map((c) => c.class_name).join(', ')}
                  </strong>
                  . Catat absensi kehadiran harian hanya dalam 1 menit.
                </p>
              </div>
            </div>

            <div className="self-stretch sm:self-center shrink-0">
              <Button
                href={`/guru/kelas/${unrecordedClasses[0].class_id}/absen`}
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
              >
                <span>Absen {unrecordedClasses[0].class_name} Sekarang</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : isAllAttendanceDone ? (
        <div className="rounded-[14px] border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-[var(--status-success-text)] flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-[var(--status-success-text)]">
                Absensi Hari Ini Sudah Lengkap
              </h3>
              <p className="text-xs text-[var(--status-success-text)] opacity-90 mt-0.5">
                Seluruh kelas bimbingan hari ini telah selesai direkap.
              </p>
            </div>
          </div>
          <Link
            href="/guru/kelas"
            className="text-xs font-semibold text-[var(--status-success-text)] hover:underline shrink-0"
          >
            Lihat riwayat
          </Link>
        </div>
      ) : (
        <div className="rounded-[14px] border border-[#E6E0D6] bg-[#FAF7F2] p-4 flex items-center gap-3 text-[var(--color-text-muted)] text-sm">
          <Calendar className="w-5 h-5 shrink-0 text-[#8B9699]" />
          <span>Tidak ada jadwal mengajar kelas untuk hari ini.</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. BLOK PERLU DINILAI                                        */}
      {/* ============================================================ */}
      <Panel
        title="Perlu Dinilai"
        subtitle="Pengumpulan tugas murid yang menunggu pemeriksaan dan nilai"
        action={
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F3EFEA] text-[var(--color-text)]">
            {dashboardData?.to_grade?.length || 0} tugas
          </span>
        }
      >
        {dashboardData && dashboardData.to_grade.length > 0 ? (
          <div className="space-y-1">
            {dashboardData.to_grade.slice(0, 5).map((item) => (
              <ListRow
                key={item.submission_id}
                href={`/guru/kelas`}
                leftSlot={
                  <div className="w-9 h-9 rounded-full bg-[#EBF2F7] text-[#3D5A80] flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                }
                title={
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{item.student_name}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      ({item.class_name})
                    </span>
                  </div>
                }
                subtitle={`${item.assignment_title} &bull; Dikumpulkan ${formatRelativeTime(item.submitted_at)}`}
                rightSlot={
                  <span className="text-xs font-semibold text-[var(--color-primary)]">
                    Periksa &rarr;
                  </span>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Semua Tugas Sudah Dinilai!"
            description="Tidak ada berkas tugas murid yang tertunda saat ini. Kerja bagus!"
            className="py-8"
          />
        )}
      </Panel>

      {/* ============================================================ */}
      {/* 3. BLOK PESAN BELUM DIBALAS                                  */}
      {/* ============================================================ */}
      <Panel
        title="Pesan Belum Dibalas"
        subtitle="Percakapan masuk dari orang tua murid atau siswa"
        action={
          <Link
            href="/guru/pesan"
            className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <span>Buka pesan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {dashboardData && dashboardData.unanswered_threads.length > 0 ? (
          <div className="space-y-1">
            {dashboardData.unanswered_threads.map((thread) => (
              <ListRow
                key={thread.thread_id}
                href="/guru/pesan"
                isUnread
                leftSlot={
                  <div className="w-9 h-9 rounded-full bg-[#FAF0E6] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                }
                title={thread.subject}
                subtitle={
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    <span>{thread.sender_name}</span>
                    <span className="capitalize">
                      {' '}
                      ({thread.sender_role === 'parent' ? 'Orang Tua' : 'Murid'})
                    </span>
                    {thread.student_name && (
                      <span> &bull; Murid: {thread.student_name}</span>
                    )}
                    <span> &bull; {formatRelativeTime(thread.created_at)}</span>
                  </div>
                }
                rightSlot={
                  thread.unread_count > 0 ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-accent)] text-white">
                      {thread.unread_count} baru
                    </span>
                  ) : undefined
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="Kotak Masuk Rapi"
            description="Semua pesan konsultasi dari orang tua dan murid sudah dibalas."
            className="py-8"
          />
        )}
      </Panel>

      {/* ============================================================ */}
      {/* 4. BLOK KHUSUS WALI KELAS: IZIN MENUNGGU PERSETUJUAN         */}
      {/* ============================================================ */}
      {profile?.is_homeroom && (
        <Panel
          title="Izin Menunggu Persetujuan"
          subtitle="Permohonan surat sakit atau izin tidak masuk dari murid/wali kelas Anda"
        >
          {dashboardData && dashboardData.pending_leaves.length > 0 ? (
            <div className="space-y-2.5">
              {dashboardData.pending_leaves.map((leave) => (
                <TeacherLeaveItem key={leave.leave_id} leave={leave} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="Tidak Ada Izin Tertunda"
              description="Belum ada pengajuan izin sakit atau keperluan keluarga yang menunggu konfirmasi."
              className="py-8"
            />
          )}
        </Panel>
      )}

      {/* ============================================================ */}
      {/* RINGKASAN KELAS MENGAJAR HARI INI                            */}
      {/* ============================================================ */}
      {dashboardData && dashboardData.today_classes.length > 0 && (
        <Panel
          title="Jadwal Mengajar Hari Ini"
          subtitle="Daftar kelas tatap muka terjadwal"
        >
          <div className="space-y-1">
            {dashboardData.today_classes.map((cls) => (
              <ListRow
                key={cls.teaching_id}
                leftSlot={
                  <div className="w-9 h-9 rounded-full bg-[#E8F1EE] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                }
                title={`${cls.class_name} — ${cls.subject_name}`}
                subtitle={`Jam sesi: ${formatTimeSpan(cls.start_time, cls.end_time)}`}
                rightSlot={
                  <Button
                    href={`/guru/kelas/${cls.class_id}/absen`}
                    variant="secondary"
                    size="sm"
                  >
                    Buka Absensi
                  </Button>
                }
                showChevron={false}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
