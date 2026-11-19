'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Jalankan hanya di browser
    if (typeof window === 'undefined') return;

    // Set initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2.5 text-center text-xs sm:text-sm font-medium transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
        isOffline
          ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-b border-[var(--status-danger-border)]'
          : 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-b border-[var(--status-success-border)]'
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Kamu sedang offline.</strong> Periksa koneksi internet Anda. Isian form Anda tetap tersimpan.
          </span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Koneksi internet kembali terhubung!</strong> Anda dapat melanjutkan aktivitas.
          </span>
        </>
      )}
    </div>
  );
}
