import Link from 'next/link';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Akses Dibatasi',
};

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center px-4 py-12 text-center">
      <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-[16px] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" aria-hidden="true" />
        </div>

        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
          Kode 403 &bull; Akses Ditolak
        </span>

        <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--color-text)]">
          Akses Dibatasi
        </h1>

        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
          Mohon maaf, peran akun Anda tidak memiliki hak untuk membuka bagian ini. Silakan kembali ke beranda peran Anda untuk mengakses fitur yang sesuai.
        </p>

        <div className="pt-2 flex justify-center">
          <Button href="/" variant="primary" className="min-h-[44px]">
            <Home className="w-4 h-4 mr-1.5" aria-hidden="true" />
            <span>Kembali ke Beranda Anda</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
