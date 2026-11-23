'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Catat error secara internal tanpa mengekspos detail ke UI pengguna
    console.error('Terjadi kesalahan aplikasi:', error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center px-4 py-12 text-center">
      <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-[16px] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" aria-hidden="true" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--color-text)]">
          Ada yang Tidak Beres
        </h1>

        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
          Mohon maaf, sistem mengalami kendala sementara saat memproses halaman ini. Silakan coba muat ulang halaman.
        </p>

        {error && (
          <div className="text-left bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-mono break-all space-y-1">
            <p className="font-bold text-red-800">Detail Kendala:</p>
            <p>{error.message || 'Error tidak diketahui'}</p>
            {error.digest && <p className="text-[10px] text-red-500">Digest: {error.digest}</p>}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            onClick={() => reset()}
            variant="primary"
            className="min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" />
            <span>Coba Lagi</span>
          </Button>

          <Button
            href="/"
            variant="secondary"
            className="min-h-[44px]"
          >
            <Home className="w-4 h-4 mr-1.5" aria-hidden="true" />
            <span>Ke Beranda</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
