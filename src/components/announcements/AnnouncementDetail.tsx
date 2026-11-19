'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Pin,
  Clock,
  Calendar,
  Share2,
  Edit3,
  CheckCircle2,
  Users,
  Eye,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDateTimeWIB, formatRelativeTime } from '@/lib/dates';
import { parseMessageText } from '@/lib/chat';
import { markAnnouncementReadAction } from '@/lib/actions/announcements';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

export interface AnnouncementDetailData {
  id: string;
  title: string;
  body: string;
  target: 'all' | 'class' | 'parents';
  class_name?: string | null;
  is_pinned: boolean;
  created_at: string;
  author_id: string;
  author_name: string;
  author_role: UserRole;
}

interface AnnouncementDetailProps {
  currentProfileId: string;
  currentRole: UserRole;
  announcement: AnnouncementDetailData;
  backHref: string;
  editHref?: string;
}

export function AnnouncementDetail({
  currentProfileId,
  currentRole,
  announcement,
  backHref,
  editHref,
}: AnnouncementDetailProps) {
  const isAuthorOrAdmin =
    announcement.author_id === currentProfileId || currentRole === 'admin';

  const [stats, setStats] = useState<{
    total_target: number;
    read_count: number;
    unread_users: Array<{ id: string; full_name: string; role: string }>;
  } | null>(null);

  // 1. Catat bahwa pengguna membaca pengumuman ini (sekali saja)
  useEffect(() => {
    markAnnouncementReadAction(announcement.id);
  }, [announcement.id]);

  // 2. Jika penulis atau admin, ambil statistik pembaca via RPC
  useEffect(() => {
    if (!isAuthorOrAdmin) return;

    const fetchStats = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('announcement_read_stats', {
        p_announcement_id: announcement.id,
      });
      if (!error && data) {
        setStats(data as any);
      }
    };

    fetchStats();
  }, [announcement.id, isAuthorOrAdmin]);

  const targetLabel =
    announcement.target === 'all'
      ? 'Semua Warga Sekolah'
      : announcement.target === 'parents'
        ? 'Seluruh Orang Tua'
        : announcement.class_name
          ? `Kelas ${announcement.class_name}`
          : 'Target Kelas';

  // Template WhatsApp share tanpa nomor tujuan
  const waShareText = encodeURIComponent(
    `📢 *Pengumuman Sekolahku*\n"${announcement.title}"\n\nSilakan buka aplikasi Sekolahku untuk membaca pengumuman selengkapnya.`
  );
  const waShareUrl = `https://wa.me/?text=${waShareText}`;

  const textTokens = parseMessageText(announcement.body);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Tombol Kembali & Aksi Atas */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Kembali ke Pengumuman</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Tombol Bagikan WhatsApp */}
          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors min-h-[44px]"
            title="Bagikan ringkasan ke WhatsApp"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Bagikan ke WA</span>
          </a>

          {/* Tombol Edit untuk Penulis / Admin */}
          {editHref && isAuthorOrAdmin && (
            <Button href={editHref} variant="secondary" size="sm" className="min-h-[44px]">
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              <span>Ubah</span>
            </Button>
          )}
        </div>
      </div>

      {/* Konten Utama Pengumuman */}
      <article className="p-6 sm:p-8 rounded-[16px] bg-white border border-[var(--color-border)] shadow-xs space-y-6">
        <div className="space-y-2.5 pb-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 flex-wrap">
            {announcement.is_pinned && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                <Pin className="w-3 h-3 fill-current" />
                <span>Disematkan</span>
              </span>
            )}
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-stone-100 text-[var(--color-text-muted)] border border-stone-200">
              {targetLabel}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)] leading-tight">
            {announcement.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)] pt-1">
            <span>
              Ditulis oleh: <strong>{announcement.author_name}</strong> (
              {announcement.author_role === 'admin' ? 'Admin Sekolah' : 'Bapak/Ibu Guru'})
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDateTimeWIB(announcement.created_at)}</span>
            </span>
          </div>
        </div>

        {/* Isi Pengumuman */}
        <div className="text-[15px] sm:text-base text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
          {textTokens.map((tok, idx) =>
            tok.type === 'link' ? (
              <a
                key={idx}
                href={tok.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] underline hover:text-[var(--color-primary-hover)] font-medium break-all"
              >
                {tok.content}
              </a>
            ) : (
              <span key={idx}>{tok.content}</span>
            )
          )}
        </div>
      </article>

      {/* Bagian Statistik Pembaca (Khusus Penulis & Admin) */}
      {isAuthorOrAdmin && stats && (
        <section className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[var(--color-primary)]" />
              <h3 className="font-bold font-display text-base text-[var(--color-text)]">
                Statistik Pembaca
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FAF7F2] text-[var(--color-text)] border border-[var(--color-border)]">
              Dibaca oleh <strong>{stats.read_count}</strong> dari {stats.total_target} orang
            </span>
          </div>

          {stats.unread_users.length > 0 ? (
            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)]">
                Belum Membaca ({stats.unread_users.length} orang):
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-stone-100">
                {stats.unread_users.map((u) => (
                  <div
                    key={u.id}
                    className="py-1.5 flex items-center justify-between text-xs text-[var(--color-text)]"
                  >
                    <span className="font-medium">{u.full_name}</span>
                    <span className="text-[11px] text-[var(--color-text-muted)] uppercase">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2 text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Semua target penerima telah membaca pengumuman ini.</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
