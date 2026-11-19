'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, MessageSquare, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/dates';
import type { UserRole } from '@/types/database';

export interface ChatThreadItem {
  id: string;
  category: 'leave' | 'consultation' | 'assignment' | 'other';
  subject: string;
  status: 'new' | 'read' | 'replied' | 'done';
  student_id: string | null;
  student_name: string | null;
  other_party_name: string;
  other_party_role: UserRole;
  other_party_phone?: string | null;
  last_message_body: string;
  last_message_at: string;
  unread_count: number;
}

interface ThreadListProps {
  currentRole: 'teacher' | 'student' | 'parent';
  threads: ChatThreadItem[];
  newMessageHref: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  leave: 'Izin',
  consultation: 'Konsultasi',
  assignment: 'Tugas/Nilai',
  other: 'Lainnya',
};

export function ThreadList({ currentRole, threads, newMessageHref }: ThreadListProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'to_reply' | 'done'>('all');

  const filteredThreads = threads.filter((t) => {
    if (activeFilter === 'unread') {
      return t.unread_count > 0;
    }
    if (activeFilter === 'to_reply') {
      return t.status === 'new';
    }
    if (activeFilter === 'done') {
      return t.status === 'done';
    }
    return true;
  });

  const unreadTotal = threads.filter((t) => t.unread_count > 0).length;
  const toReplyTotal = threads.filter((t) => t.status === 'new').length;

  return (
    <div className="space-y-6">
      {/* Header Aksi: Judul & Tombol Pesan Baru */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
            Pesan & Konsultasi
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Komunikasi langsung seputar kegiatan belajar, izin, dan perkembangan siswa.
          </p>
        </div>

        <Button href={newMessageHref} variant="primary" className="self-start sm:self-auto min-h-[44px]">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Pesan Baru</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-[var(--color-border)] gap-2 sm:gap-4 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeFilter === 'all'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span>Semua</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {threads.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('unread')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeFilter === 'unread'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span>Belum Dibaca</span>
          {unreadTotal > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] font-bold">
              {unreadTotal}
            </span>
          )}
        </button>

        {currentRole === 'teacher' && (
          <button
            type="button"
            onClick={() => setActiveFilter('to_reply')}
            className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
              activeFilter === 'to_reply'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <span>Perlu Dibalas</span>
            {toReplyTotal > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                {toReplyTotal}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveFilter('done')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeFilter === 'done'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span>Selesai</span>
        </button>
      </div>

      {/* Konten Daftar Thread */}
      {filteredThreads.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Belum Ada Percakapan"
          description={
            activeFilter !== 'all'
              ? 'Tidak ada percakapan pada filter ini.'
              : 'Mulai percakapan baru dengan menekan tombol Pesan Baru di atas.'
          }
          actionLabel="Buat Pesan Baru"
          actionHref={newMessageHref}
        />
      ) : (
        <div className="space-y-2">
          {filteredThreads.map((thread) => {
            const rolePrefix =
              thread.other_party_role === 'teacher'
                ? 'Bpk/Ibu '
                : thread.other_party_role === 'parent'
                  ? 'Wali Murid: '
                  : 'Murid: ';

            const subInfo = thread.student_name
              ? `Tentang ananda ${thread.student_name}`
              : null;

            return (
              <ListRow
                key={thread.id}
                href={`/${currentRole}/pesan/${thread.id}`}
                leftSlot={
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                      thread.unread_count > 0
                        ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {thread.other_party_name.slice(0, 1).toUpperCase()}
                  </div>
                }
                title={
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-[var(--color-text)]">
                      {rolePrefix}
                      {thread.other_party_name}
                    </span>
                    {subInfo && (
                      <span className="text-xs text-[var(--color-text-muted)] italic">
                        ({subInfo})
                      </span>
                    )}
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FAF7F2] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                      {CATEGORY_LABELS[thread.category] || thread.category}
                    </span>
                    <StatusBadge status={thread.status} size="sm" />
                  </div>
                }
                subtitle={
                  <div className="space-y-0.5 mt-0.5">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--color-text)] line-clamp-1">
                      {thread.subject}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-1">
                      {thread.last_message_body || 'Belum ada isi pesan'}
                    </p>
                  </div>
                }
                rightSlot={
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                      {formatRelativeTime(thread.last_message_at)}
                    </span>
                    {thread.unread_count > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--color-accent)] text-white">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
