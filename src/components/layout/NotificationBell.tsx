'use client';

import React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

export interface NotificationBellProps {
  unreadCount?: number;
  href: string;
}

export function NotificationBell({ unreadCount = 0, href }: NotificationBellProps) {
  const hasUnread = unreadCount > 0;

  return (
    <Link
      href={href}
      className="relative p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[#F3EFEA] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
      aria-label={
        hasUnread
          ? `Notifikasi: ${unreadCount} pesan belum dibaca`
          : 'Lihat notifikasi'
      }
    >
      <Bell className="w-5 h-5" aria-hidden="true" />
      {hasUnread && (
        <span
          className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white"
          aria-hidden="true"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
