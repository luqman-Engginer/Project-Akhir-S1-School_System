'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin panel error:', error.message);
  }, [error]);

  return (
    <div className="p-6 sm:p-8 bg-white rounded-[16px] border border-[var(--color-border)] shadow-xs max-w-lg mx-auto text-center space-y-4 my-8">
      <div className="w-12 h-12 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-bold font-display text-[var(--color-text)]">
        Ada yang Tidak Beres di Panel Admin
      </h2>

      <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
        Terjadi kendala saat memuat data administratif. Data Anda tetap aman. Silakan muat ulang halaman.
      </p>

      <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
        <Button onClick={() => reset()} variant="primary" className="min-h-[44px]">
          <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" />
          <span>Coba Lagi</span>
        </Button>
        <Button href="/admin" variant="secondary" className="min-h-[44px]">
          <Home className="w-4 h-4 mr-1.5" aria-hidden="true" />
          <span>Beranda Admin</span>
        </Button>
      </div>
    </div>
  );
}
