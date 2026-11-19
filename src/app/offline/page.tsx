import Link from 'next/link';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Koneksi Terputus',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center px-4 py-12 text-center">
      <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-[16px] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] flex items-center justify-center mx-auto">
          <WifiOff className="w-6 h-6" aria-hidden="true" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--color-text)]">
          Koneksi Internet Terputus
        </h1>

        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
          Perangkat Anda sedang tidak terhubung ke jaringan internet. Periksa koneksi Wi-Fi atau data seluler Anda, lalu coba lagi.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            href="/"
            variant="primary"
            className="min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" />
            <span>Coba Muat Ulang</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
