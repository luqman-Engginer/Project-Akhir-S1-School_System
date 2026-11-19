'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pin, Megaphone, Plus, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/dates';
import type { UserRole } from '@/types/database';

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  target: 'all' | 'class' | 'parents';
  class_id?: string | null;
  class_name?: string | null;
  is_pinned: boolean;
  created_at: string;
  author_name: string;
  author_role: UserRole;
  is_read: boolean;
}

interface AnnouncementListProps {
  currentRole: UserRole;
  announcements: AnnouncementItem[];
  createHref?: string;
  detailBaseHref: string;
}

export function AnnouncementList({
  currentRole,
  announcements,
  createHref,
  detailBaseHref,
}: AnnouncementListProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredItems = announcements.filter((item) => {
    if (filter === 'unread') return !item.is_read;
    return true;
  });

  // Urutkan: Pinned di atas, lalu created_at DESC
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const unreadCount = announcements.filter((a) => !a.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header & Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
            Pengumuman Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Informasi resmi, agenda kegiatan, dan edaran sekolah.
          </p>
        </div>

        {createHref && (currentRole === 'admin' || currentRole === 'teacher') && (
          <Button href={createHref} variant="primary" className="self-start sm:self-auto min-h-[44px]">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Buat Pengumuman</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-[var(--color-border)] gap-2 sm:gap-4 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            filter === 'all'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span>Semua</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {announcements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            filter === 'unread'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span>Belum Dibaca</span>
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Daftar Pengumuman */}
      {sortedItems.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Belum Ada Pengumuman"
          description={
            filter === 'unread'
              ? 'Semua pengumuman sudah Anda baca.'
              : 'Belum ada pengumuman yang dirilis saat ini.'
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedItems.map((item) => {
            const targetLabel =
              item.target === 'all'
                ? 'Semua Warga Sekolah'
                : item.target === 'parents'
                  ? 'Seluruh Orang Tua'
                  : item.class_name
                    ? `Kelas ${item.class_name}`
                    : 'Target Kelas';

            return (
              <Link
                key={item.id}
                href={`${detailBaseHref}/${item.id}`}
                className={`block p-4 sm:p-5 rounded-[12px] border transition-all hover:shadow-xs group ${
                  item.is_pinned
                    ? 'bg-[#FAF7F2] border-[var(--color-primary)]/40 hover:border-[var(--color-primary)]'
                    : 'bg-white border-[var(--color-border)] hover:border-stone-400'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                          <Pin className="w-3 h-3 fill-current" />
                          <span>Disematkan</span>
                        </span>
                      )}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-[var(--color-text-muted)] border border-stone-200">
                        {targetLabel}
                      </span>
                      {!item.is_read && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>Baru</span>
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold font-display text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>

                  <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <span>
                      Oleh: <strong>{item.author_name}</strong> ({item.author_role === 'admin' ? 'Admin Sekolah' : 'Bapak/Ibu Guru'})
                    </span>
                    <span className="font-semibold text-[var(--color-primary)] group-hover:underline">
                      Baca selengkapnya &rarr;
                    </span>
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
