'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function MuridError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Murid area error:', error.message);
  }, [error]);

  return (
    <div className="p-6 sm:p-8 bg-white rounded-[16px] border border-[var(--color-border)] shadow-xs max-w-lg mx-auto text-center space-y-4 my-8">
      <div className="w-12 h-12 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-bold font-display text-[var(--color-text)]">
        Ada yang Tidak Beres
      </h2>

      <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
        Terjadi kendala saat memuat jadwal atau tugas sekolahmu. Jawaban atau file yang sudah terkirim tetap aman. Silakan muat ulang.
      </p>

      <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
        <Button onClick={() => reset()} variant="primary" className="min-h-[44px]">
          <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" />
          <span>Coba Lagi</span>
        </Button>
        <Button href="/murid" variant="secondary" className="min-h-[44px]">
          <Home className="w-4 h-4 mr-1.5" aria-hidden="true" />
          <span>Beranda Murid</span>
        </Button>
      </div>
    </div>
  );
}
