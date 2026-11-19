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

  // Sync initial count
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Ignore background errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Realtime subscription + Fallback Polling (60s)
  useEffect(() => {
    if (!profileId) return;

    const supabase = createClient();
    const channelName = `realtime:notifications:${profileId}`;

    const channel = supabase
      .channel(channelName)
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

          // Tampilkan Toast mengambang sesuai PRD
          toast(`${newNotif.title}: ${newNotif.body}`, 'info');
        }
      )
      .subscribe();

    // Fallback polling interval 60s
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [profileId, toast, loadNotifications]);

  // Load saat dibuka jika belum dimuat
  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  // Close when clicking outside in desktop
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
        return <ClipboardList className="w-4 h-4 text-[var(--color-primary)]" />;
      case 'leave':
        return <Clock className="w-4 h-4 text-[#C8643B]" />;
      case 'assignment':
        return <FileCheck className="w-4 h-4 text-[#3D5A80]" />;
      case 'grade':
        return <FileCheck className="w-4 h-4 text-[var(--color-primary)]" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-[#3D5A80]" />;
      case 'reminder':
        return <Bell className="w-4 h-4 text-[#C8643B]" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-[#C8643B]" />;
      default:
        return <AlertCircle className="w-4 h-4 text-[var(--color-text-muted)]" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[#F3EFEA] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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
            className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white pointer-events-none"
          >
            <span className="sr-only">{unreadCount} notifikasi baru belum dibaca</span>
            <span aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </span>
        )}
      </button>

      {/* Popover (Desktop) / Bottom Sheet (Mobile) */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-40 md:hidden animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
            aria-hidden={true}
          />

          <div
            className="
              fixed md:absolute bottom-0 md:bottom-auto left-0 md:left-auto right-0 md:right-0
              w-full md:w-96 max-h-[85vh] md:max-h-[520px]
              bg-[var(--color-surface)] border border-[var(--color-border)]
              rounded-t-[20px] md:rounded-[14px] shadow-xl md:shadow-lg
              z-50 md:z-40 md:mt-2 flex flex-col overflow-hidden
              animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-150
            "
            role="region"
            aria-label="Panel Notifikasi"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-[#F0EBE1] flex items-center justify-between bg-[#FAF7F2]">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm sm:text-base text-[var(--color-text)]">
                  Notifikasi
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] font-semibold border border-[var(--status-danger-border)]">
                    {unreadCount} baru
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline font-medium px-2 py-1 rounded-[6px] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer"
                    title="Tandai semua telah dibaca"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Tandai dibaca</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-full hover:bg-black/5"
                  aria-label="Tutup panel notifikasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#F4EFE6] max-h-[420px]">
              {isLoading && notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
                  Memuat notifikasi...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Bell}
                    title="Belum Ada Notifikasi"
                    description="Pemberitahuan absensi, tugas, dan pesan penting akan muncul di sini."
                  />
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`
                      w-full text-left p-3.5 sm:p-4 flex items-start gap-3 transition-colors cursor-pointer
                      hover:bg-[#F3EFEA] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]
                      ${!n.is_read ? 'bg-[#FCFAF7]' : 'bg-transparent'}
                    `}
                  >
                    {/* Unread indicator / icon */}
                    <div className="shrink-0 mt-0.5 relative">
                      <div className="w-7 h-7 rounded-full bg-[#EFEAE2] flex items-center justify-center">
                        {getNotifIcon(n.type)}
                      </div>
                      {!n.is_read && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] border border-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs sm:text-sm leading-snug line-clamp-1 ${
                            !n.is_read
                              ? 'font-bold text-[var(--color-text)]'
                              : 'font-medium text-[var(--color-text)]'
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    </div>

                    {n.link && (
                      <ExternalLink className="w-3.5 h-3.5 text-[#A5AFB2] shrink-0 mt-1" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
