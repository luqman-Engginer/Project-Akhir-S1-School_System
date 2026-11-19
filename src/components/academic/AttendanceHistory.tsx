import React from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  HelpCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { ListRow } from '@/components/ui/ListRow';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import {
  AttendanceCalendar,
  CalendarAttendanceRecord,
} from './AttendanceCalendar';
import { formatWIB } from '@/lib/dates';

interface AttendanceHistoryProps {
  title?: string;
  studentName?: string;
  attendancePercent: number;
  daysPresent: number;
  totalSchoolDays: number;
  recentAttendance: CalendarAttendanceRecord[];
}

export function AttendanceHistory({
  title = 'Rekap Kehadiran Siswa',
  studentName,
  attendancePercent,
  daysPresent,
  totalSchoolDays,
  recentAttendance,
}: AttendanceHistoryProps) {
  const roundedPercent = Math.round(attendancePercent || 0);

  return (
    <div className="space-y-6">
      {/* 1. Ringkasan Angka Besar */}
      <div className="p-5 sm:p-6 rounded-[16px] bg-white border border-[#E6E0D6] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            Tingkat Kehadiran 30 Hari Terakhir
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-display text-[var(--color-primary)]">
              {isNaN(roundedPercent) ? '0%' : `${roundedPercent}%`}
            </span>
            <span className="text-sm text-[var(--color-text-muted)] font-medium">
              kehadiran
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text)] mt-1">
            {studentName ? `${studentName} tercatat hadir` : 'Tercatat hadir'}{' '}
            <strong>{daysPresent}</strong> dari <strong>{totalSchoolDays}</strong> hari sekolah aktif.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {roundedPercent >= 90 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success-text)] font-semibold text-xs border border-[var(--status-success-border)]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sangat Disiplin</span>
            </span>
          ) : roundedPercent >= 75 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] font-semibold text-xs border border-[var(--status-warning-border)]">
              <Clock className="w-4 h-4" />
              <span>Cukup Baik</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] font-semibold text-xs border border-[var(--status-danger-border)]">
              <XCircle className="w-4 h-4" />
              <span>Perlu Ditingkatkan</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Kalender Mini Bulanan */}
      <Panel
        title="Kalender Kehadiran"
        subtitle="Riwayat kehadiran harian dalam kalender"
      >
        <AttendanceCalendar records={recentAttendance} />
      </Panel>

      {/* 3. Daftar Absensi Terbaru */}
      <Panel
        title="Daftar Catatan Absensi Terakhir"
        subtitle="10 catatan absensi terbaru"
      >
        {recentAttendance.length > 0 ? (
          <div className="space-y-1">
            {recentAttendance.slice(0, 10).map((item) => {
              const formattedDate = formatWIB(item.date, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });

              return (
                <ListRow
                  key={item.date}
                  title={formattedDate}
                  subtitle={
                    item.note ? (
                      <span className="italic">Catatan: {item.note}</span>
                    ) : item.status === 'present' ? (
                      'Hadir tepat waktu'
                    ) : (
                      'Tanpa catatan tambahan'
                    )
                  }
                  rightSlot={
                    <StatusBadge
                      status={item.status as StatusVariant}
                      size="sm"
                    />
                  }
                  showChevron={false}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
            Belum ada catatan absensi.
          </div>
        )}
      </Panel>
    </div>
  );
}
