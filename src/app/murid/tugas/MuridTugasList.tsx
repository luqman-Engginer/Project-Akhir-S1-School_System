'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, AlertCircle, CheckCircle2, Award, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeDeadline, formatDateTimeWIB } from '@/lib/dates';
import type { AttendanceStatus } from '@/types/database';

export interface MuridAssignmentItem {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  subject_name: string;
  teacher_name: string;
  status: 'not_submitted' | 'submitted' | 'late' | 'graded' | 'overdue_not_submitted';
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
}

interface MuridTugasListProps {
  assignments: MuridAssignmentItem[];
}

export function MuridTugasList({ assignments }: MuridTugasListProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'graded'>('pending');

  const pendingList = assignments
    .filter((a) => a.status === 'not_submitted' || a.status === 'overdue_not_submitted')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const submittedList = assignments
    .filter((a) => a.status === 'submitted' || a.status === 'late')
    .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());

  const gradedList = assignments
    .filter((a) => a.status === 'graded')
    .sort((a, b) => new Date(b.graded_at || b.deadline).getTime() - new Date(a.graded_at || a.deadline).getTime());

  const currentList =
    activeTab === 'pending'
      ? pendingList
      : activeTab === 'submitted'
        ? submittedList
        : gradedList;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] gap-2 sm:gap-4 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span>Belum Selesai</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'pending'
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {pendingList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('submitted')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'submitted'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span>Sudah Dikumpulkan</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'submitted'
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {submittedList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('graded')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'graded'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span>Dinilai</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'graded'
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {gradedList.length}
          </span>
        </button>
      </div>

      {/* Konten Daftar Tugas */}
      {currentList.length === 0 ? (
        activeTab === 'pending' ? (
          <EmptyState
            icon={CheckCircle2}
            title="Semua Tugas Sudah Selesai!"
            description="Tidak ada tugas tertunda untuk saat ini. Kerja bagus, silakan istirahat atau mengulang materi."
            actionLabel="Lihat Jadwal & Nilai"
            actionHref="/murid/jadwal-nilai"
          />
        ) : activeTab === 'submitted' ? (
          <EmptyState
            icon={Clock}
            title="Belum Ada Pengumpulan yang Menunggu Penilaian"
            description="Tugas yang baru saja kamu kumpulkan akan tampil di tab ini sebelum diperiksa oleh bapak/ibu guru."
          />
        ) : (
          <EmptyState
            icon={Award}
            title="Belum Ada Tugas yang Dinilai"
            description="Nilai dan umpan balik tugas yang telah diperiksa bapak/ibu guru akan muncul di sini."
          />
        )
      ) : (
        <div className="space-y-3">
          {currentList.map((item) => {
            const relDeadline = formatRelativeDeadline(item.deadline);

            return (
              <Link
                key={item.id}
                href={`/murid/tugas/${item.id}`}
                className="block p-4 sm:p-5 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F4EFEA] text-[var(--color-text-muted)]">
                        {item.subject_name}
                      </span>
                      <StatusBadge status={item.status as any} />
                      {activeTab === 'pending' && relDeadline.isUrgent && (
                        <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Deadline &lt; 24 jam</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold font-display text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                      Guru Pengampu: {item.teacher_name}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--color-border)] shrink-0 gap-1">
                    {item.score !== null ? (
                      <div className="text-right">
                        <span className="text-xs text-[var(--color-text-muted)] block">Nilai</span>
                        <span className="text-xl sm:text-2xl font-bold font-display text-[var(--color-primary)]">
                          {item.score}
                          <span className="text-xs font-normal text-[var(--color-text-muted)]">/100</span>
                        </span>
                      </div>
                    ) : (
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-[var(--color-text-muted)] block">Tenggat Waktu</span>
                        <span
                          className={`text-xs sm:text-sm font-medium ${
                            relDeadline.isOverdue
                              ? 'text-rose-600 font-semibold'
                              : relDeadline.isUrgent
                                ? 'text-amber-700 font-semibold'
                                : 'text-[var(--color-text)]'
                          }`}
                        >
                          {relDeadline.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
