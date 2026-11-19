import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileQuestion,
  FileCheck2,
  HelpCircle,
  MinusCircle,
} from 'lucide-react';

export type StatusVariant =
  // Attendance
  | 'hadir'
  | 'present'
  | 'sakit'
  | 'sick'
  | 'izin'
  | 'excused'
  | 'alpa'
  | 'absent'
  // Submission
  | 'belum dikumpulkan'
  | 'belum dikerjakan'
  | 'not_submitted'
  | 'missing'
  | 'dikumpulkan'
  | 'submitted'
  | 'terlambat'
  | 'late'
  | 'dinilai'
  | 'graded'
  | 'overdue_not_submitted'
  | 'lewat deadline'
  // Leave / Approval
  | 'menunggu'
  | 'pending'
  | 'disetujui'
  | 'approved'
  | 'ditolak'
  | 'rejected'
  // Thread Status
  | 'new'
  | 'read'
  | 'replied'
  | 'done'
  | 'selesai'
  // General
  | 'info'
  | 'neutral';

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  className: string;
}

const STATUS_CONFIGS: Record<StatusVariant, StatusConfig> = {
  // Kehadiran
  hadir: {
    label: 'Hadir',
    icon: CheckCircle2,
    className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
  },
  present: {
    label: 'Hadir',
    icon: CheckCircle2,
    className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
  },
  sakit: {
    label: 'Sakit',
    icon: Clock,
    className: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]',
  },
  sick: {
    label: 'Sakit',
    icon: Clock,
    className: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]',
  },
  izin: {
    label: 'Izin',
    icon: HelpCircle,
    className: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)]',
  },
  excused: {
    label: 'Izin',
    icon: HelpCircle,
    className: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)]',
  },
  alpa: {
    label: 'Alpa',
    icon: XCircle,
    className: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  },
  absent: {
    label: 'Alpa',
    icon: XCircle,
    className: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  },

  // Tugas
  'belum dikerjakan': {
    label: 'Belum Dikerjakan',
    icon: FileQuestion,
    className: 'bg-[#F2EFE9] text-[#5B676B] border-[#DDD7CD]',
  },
  not_submitted: {
    label: 'Belum Dikerjakan',
    icon: FileQuestion,
    className: 'bg-[#F2EFE9] text-[#5B676B] border-[#DDD7CD]',
  },
  'belum dikumpulkan': {
    label: 'Belum Dikerjakan',
    icon: FileQuestion,
    className: 'bg-[#F2EFE9] text-[#5B676B] border-[#DDD7CD]',
  },
  missing: {
    label: 'Belum Dikerjakan',
    icon: FileQuestion,
    className: 'bg-[#F2EFE9] text-[#5B676B] border-[#DDD7CD]',
  },
  'lewat deadline': {
    label: 'Lewat Deadline',
    icon: AlertCircle,
    className: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  },
  overdue_not_submitted: {
    label: 'Lewat Deadline',
    icon: AlertCircle,
    className: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  },
  dikumpulkan: {
    label: 'Sudah Kumpul',
    icon: FileCheck2,
    className: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)]',
  },
  submitted: {
    label: 'Sudah Kumpul',
    icon: FileCheck2,
    className: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)]',
  },
  terlambat: {
    label: 'Terlambat',
    icon: AlertCircle,
    className: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  },
  late: {
    label: 'Terlambat',
    icon: AlertCircle,
    className: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  },
  dinilai: {
    label: 'Dinilai',
    icon: CheckCircle2,
    className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
  },
  graded: {
    label: 'Dinilai',
    icon: CheckCircle2,
    className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
  },

  // Permohonan
  menunggu: {
    label: 'Menunggu',
    icon: Clock,
    className: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]',
  },
  pending: {
    label: 'Menunggu',
    icon: Clock,
    className: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]',
  },
  disetujui: {
    label: 'Disetujui',
    icon: CheckCircle2,
    className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
  },
  approved: {
    label: 'Disetujui',
    icon: CheckCircle2,
    className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
  },
  ditolak: {
    label: 'Ditolak',
    icon: XCircle,
    className: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  },
  rejected: {
    label: 'Ditolak',
    icon: XCircle,
    className: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  },

  // Thread Status
  new: {
    label: 'Baru',
    icon: AlertCircle,
    className: 'bg-[#FDF2ED] text-[#C8643B] border-[#F5DACD]',
  },
  read: {
    label: 'Dibaca',
    icon: Clock,
    className: 'bg-[#F3EFEA] text-[#5B676B] border-[#E6E0D6]',
  },
  replied: {
    label: 'Dibalas',
    icon: FileCheck2,
    className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
  },
  done: {
    label: 'Selesai',
    icon: CheckCircle2,
    className: 'bg-[#F0F2F3] text-[#5B676B] border-[#DCE1E3]',
  },
  selesai: {
    label: 'Selesai',
    icon: CheckCircle2,
    className: 'bg-[#F0F2F3] text-[#5B676B] border-[#DCE1E3]',
  },

  // General
  info: {
    label: 'Info',
    icon: HelpCircle,
    className: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)]',
  },
  neutral: {
    label: 'Status',
    icon: MinusCircle,
    className: 'bg-[#F2EFE9] text-[#5B676B] border-[#DDD7CD]',
  },
};

export interface StatusBadgeProps {
  status: StatusVariant;
  customLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({
  status,
  customLabel,
  className = '',
  size = 'md',
}: StatusBadgeProps) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.neutral;
  const Icon = config.icon;
  const displayLabel = customLabel || config.label;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs gap-1'
      : 'px-2.5 py-1 text-xs sm:text-sm gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.className} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden={true} />
      <span>{displayLabel}</span>
    </span>
  );
}
