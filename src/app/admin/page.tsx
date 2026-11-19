import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  HeartHandshake,
  TrendingUp,
  AlertTriangle,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { ListRow } from '@/components/ui/ListRow';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  getGreetingWIB,
  formatWIB,
  formatRelativeTime,
} from '@/lib/dates';
import {
  AttendanceTrendChart,
  ClassScoresChart,
} from './AdminChartsWrapper';
import type { AdminDashboard } from '@/types/dashboard';

export default async function AdminHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  let dashboardData: AdminDashboard | null = null;
  let rpcError: string | null = null;

  try {
    const { data, error } = await supabase.rpc('dashboard_admin');
    if (error) {
      rpcError = error.message;
    } else {
      dashboardData = data as unknown as AdminDashboard;
    }
  } catch (err: unknown) {
    rpcError = err instanceof Error ? err.message : 'Gagal memuat dashboard admin';
  }

  const greeting = getGreetingWIB();
  const adminName = profile?.full_name || 'Admin Sekolah';
  const todayFormatted = formatWIB(new Date(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const attendancePercent = dashboardData
    ? Math.round(dashboardData.attendance_today_percent || 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Salam */}
      <div>
        <div className="text-xs sm:text-sm font-medium text-[var(--color-primary)]">
          {todayFormatted}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)] tracking-tight mt-0.5">
          {greeting}, {adminName}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Ringkasan eksekutif statistik warga sekolah dan performa akademik SMK Sekolahku.
        </p>
      </div>

      {/* Error alert bila terjadi gangguan */}
      {rpcError && (
        <div
          role="alert"
          className="p-4 rounded-[12px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-sm flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Terjadi kendala saat memuat metrik admin.</p>
            <p className="text-xs opacity-90 mt-0.5">{rpcError}</p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. ELEMEN UTAMA: 4 ANGKA RINGKAS DALAM SATU PANEL            */}
      {/* ============================================================ */}
      <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#F0EBE1]">
          {/* Total Guru */}
          <Link
            href="/admin/pengguna?role=teacher"
            className="p-4 sm:p-5 hover:bg-stone-50 transition-colors block group"
          >
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span className="group-hover:text-[var(--color-primary)] font-medium">Total Guru</span>
              <GraduationCap className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--color-text)]">
                {dashboardData?.users_by_role?.teacher ?? 0}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">orang</span>
            </div>
          </Link>

          {/* Total Murid */}
          <Link
            href="/admin/pengguna?role=student"
            className="p-4 sm:p-5 hover:bg-stone-50 transition-colors block group"
          >
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span className="group-hover:text-[#3D5A80] font-medium">Total Murid</span>
              <Users className="w-4 h-4 text-[#3D5A80]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--color-text)]">
                {dashboardData?.users_by_role?.student ?? 0}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">siswa</span>
            </div>
          </Link>

          {/* Total Orang Tua */}
          <Link
            href="/admin/pengguna?role=parent"
            className="p-4 sm:p-5 hover:bg-stone-50 transition-colors block group"
          >
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span className="group-hover:text-[var(--color-accent)] font-medium">Wali Murid</span>
              <HeartHandshake className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--color-text)]">
                {dashboardData?.users_by_role?.parent ?? 0}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">wali</span>
            </div>
          </Link>

          {/* Kehadiran Hari Ini */}
          <Link
            href="/admin/kelas-mapel"
            className="p-4 sm:p-5 bg-[#FAF7F2] hover:bg-[#F5F0E8] transition-colors block group"
          >
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span className="group-hover:text-[var(--color-primary)] font-medium">Kehadiran Hari Ini</span>
              <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--color-primary)]">
                {isNaN(attendancePercent) ? '0%' : `${attendancePercent}%`}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">hadir</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2 & 3. GRAFIK TREN KEHADIRAN & NILAI RATA-RATA               */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik 1: Kehadiran 7 Hari */}
        <Panel
          title="Tren Kehadiran (7 Hari Terakhir)"
          subtitle="Persentase murid yang hadir di sekolah per hari"
        >
          <AttendanceTrendChart
            data={dashboardData?.attendance_last_7_days || []}
          />
        </Panel>

        {/* Grafik 2: Rata-rata Nilai per Kelas */}
        <Panel
          title="Rata-rata Nilai per Kelas"
          subtitle="Performa akumulasi seluruh tugas mata pelajaran"
          action={
            <Link
              href="/admin/kelas-mapel"
              className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              <span>Kelola kelas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <ClassScoresChart
            data={dashboardData?.average_score_per_class || []}
          />
        </Panel>
      </div>

      {/* ============================================================ */}
      {/* 4. BLOK PERLU PERHATIAN (KETIDAKHADIRAN TINGGI)               */}
      {/* ============================================================ */}
      <Panel
        title="Perlu Perhatian (Ketidakhadiran)"
        subtitle="Siswa dengan catatan alpa atau izin yang memerlukan tindak lanjut bimbingan"
      >
        {dashboardData && dashboardData.students_high_absence.length > 0 ? (
          <div className="space-y-1">
            {dashboardData.students_high_absence.map((student) => (
              <ListRow
                key={student.student_id}
                href={`/admin/pengguna/${student.student_id}`}
                leftSlot={
                  <div className="w-9 h-9 rounded-full bg-[#FDF2F2] text-[var(--status-danger-text)] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                }
                title={
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base">
                      {student.student_name}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      ({student.class_name})
                    </span>
                  </div>
                }
                subtitle={`Rincian: ${student.absent_count} alpa, ${student.sick_count} sakit, ${student.excused_count} izin`}
                rightSlot={
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]">
                    Total {student.total_absences} hari tidak hadir
                  </span>
                }
                showChevron={false}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Tingkat Kehadiran Sangat Baik!"
            description="Tidak ada siswa dengan tingkat absensi tinggi yang membutuhkan perhatian khusus saat ini."
            className="py-8"
          />
        )}
      </Panel>

      {/* ============================================================ */}
      {/* 5. BLOK PENGUMUMAN TERBARU                                   */}
      {/* ============================================================ */}
      <Panel
        title="Pengumuman Sekolah Terbaru"
        subtitle="Siaran informasi yang telah diterbitkan"
        action={
          <Link
            href="/admin/pengumuman"
            className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <span>Kelola siaran</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {dashboardData && dashboardData.latest_announcements.length > 0 ? (
          <div className="space-y-1">
            {dashboardData.latest_announcements.slice(0, 3).map((item) => (
              <ListRow
                key={item.id}
                href="/admin/pengumuman"
                leftSlot={
                  <div className="w-9 h-9 rounded-full bg-[#FAF0E6] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                }
                title={item.title}
                subtitle={`Penulis: ${item.author_name} &bull; Target: ${item.target}`}
                rightSlot={
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {formatRelativeTime(item.created_at)}
                  </span>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Megaphone}
            title="Belum Ada Siaran Pengumuman"
            description="Terbitkan pengumuman baru untuk guru, murid, atau wali murid dari menu Pengumuman."
            className="py-8"
          />
        )}
      </Panel>
    </div>
  );
}
