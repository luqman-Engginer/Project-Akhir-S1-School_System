'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  X,
  ExternalLink,
  MessageSquare,
  ClipboardList,
  AlertCircle,
  FileCheck,
  Megaphone,
  Clock,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationItem,
} from '@/lib/actions/notifications';
import { formatRelativeTime } from '@/lib/dates';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';

export interface NotificationPanelProps {
  profileId?: string;
  initialUnreadCount?: number;
  className?: string;
}

export function NotificationPanel({
  profileId,
  initialUnreadCount = 0,
  className = '',
}: NotificationPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fungsi sinkronisasi data notifikasi dari database
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Muat notifikasi saat pertama kali halaman dibuka agar badge & list selalu sinkron
  useEffect(() => {
    if (profileId) {
      loadNotifications();
    }
  }, [profileId, loadNotifications]);

  // Realtime subscription + Fallback Polling (60s)
  useEffect(() => {
    if (!profileId) return;

    const supabase = createClient();
    const uniqueChannelName = `notif:${profileId}:${Math.random().toString(36).substring(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profileId}`,
          },
          (payload) => {
            const newNotif = payload.new as NotificationItem;
            setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
            setUnreadCount((c) => c + 1);

            // Tampilkan Toast notifikasi mengambang
            toast(`${newNotif.title}: ${newNotif.body}`, 'info');
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error (fallback to polling):', err);
    }

    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 60000);

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      clearInterval(pollInterval);
    };
  }, [profileId, toast, loadNotifications]);

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  // Tutup panel saat klik di luar atau tekan tombol Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      await markNotificationAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'attendance':
        return <ClipboardList className="w-4 h-4 text-emerald-800" />;
      case 'leave':
        return <Clock className="w-4 h-4 text-amber-800" />;
      case 'assignment':
        return <FileCheck className="w-4 h-4 text-sky-800" />;
      case 'grade':
        return <FileCheck className="w-4 h-4 text-emerald-800" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-indigo-800" />;
      case 'reminder':
        return <Bell className="w-4 h-4 text-amber-800" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-emerald-800" />;
      default:
        return <AlertCircle className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      {/* Tombol Lonceng Notifikasi */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#144D40] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
        aria-label={
          unreadCount > 0
            ? `Notifikasi: ${unreadCount} belum dibaca`
            : 'Buka notifikasi'
        }
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" aria-hidden={true} />
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            className="absolute top-1.5 right-1.5 min-w-[19px] h-[19px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-2xs pointer-events-none"
          >
            <span className="sr-only">{unreadCount} notifikasi baru belum dibaca</span>
            <span aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </span>
        )}
      </button>

      {/* Popover / Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop mobile */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 sm:hidden animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
            aria-hidden={true}
          />

          <div
            className="
              fixed sm:absolute bottom-0 sm:bottom-auto left-0 sm:left-auto right-0 top-auto sm:top-full
              w-full sm:w-96 max-h-[85vh] sm:max-h-[520px]
              bg-white border-2 border-stone-200/95
              rounded-t-2xl sm:rounded-2xl shadow-2xl
              z-50 sm:mt-2.5 flex flex-col overflow-hidden
              animate-in slide-in-from-bottom-4 sm:slide-in-from-top-2 sm:zoom-in-95 duration-150
            "
            role="region"
            aria-label="Panel Notifikasi"
          >
            {/* Header Panel */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-stone-200 bg-[#FAF7F2] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-stone-900">
                  Notifikasi
                </h3>
                {unreadCount > 0 ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 font-bold border border-amber-300">
                    {unreadCount} baru
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold border border-stone-200">
                    Semua terbaca
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1.5 text-xs text-[#144D40] hover:text-[#0F3B31] font-bold px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Tandai semua telah dibaca"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Tandai dibaca</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors"
                  aria-label="Tutup panel notifikasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 max-h-[400px]">
              {isLoading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-stone-500">
                  Memuat data notifikasi terbaru...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Bell}
                    title="Belum Ada Notifikasi"
                    description="Pemberitahuan absensi harian, tenggat tugas, dan pesan konsultasi akan tampil di sini."
                  />
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`
                      w-full text-left p-4 flex items-start gap-3.5 transition-colors cursor-pointer
                      hover:bg-stone-50/90 focus-visible:outline-2 focus-visible:outline-[#144D40]
                      ${!n.is_read ? 'bg-amber-50/40' : 'bg-white'}
                    `}
                  >
                    {/* Icon bulat dengan indikator status belum dibaca */}
                    <div className="shrink-0 mt-0.5 relative">
                      <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center">
                        {getNotifIcon(n.type)}
                      </div>
                      {!n.is_read && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-600 border-2 border-white shadow-2xs" />
                      )}
                    </div>

                    {/* Konten Notifikasi */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs sm:text-sm leading-snug line-clamp-1 ${
                            !n.is_read
                              ? 'font-extrabold text-stone-900'
                              : 'font-semibold text-stone-800'
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-stone-400">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed font-medium">
                        {n.body}
                      </p>
                    </div>

                    {n.link && (
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-1" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer Panel */}
            <div className="p-3 bg-[#FAF7F2] border-t border-stone-200 text-center text-[11px] font-semibold text-stone-500 shrink-0">
              Sinkronisasi otomatis &bull; SMK Sekolahku
            </div>
          </div>
        </>
      )}
    </div>
  );
}
