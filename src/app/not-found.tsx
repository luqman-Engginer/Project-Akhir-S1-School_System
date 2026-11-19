import Link from 'next/link';
import { Home, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Halaman Tidak Ditemukan',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center px-4 py-12 text-center">
      <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-[16px] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mx-auto">
          <HelpCircle className="w-8 h-8" aria-hidden="true" />
        </div>

        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
          Kode 404
        </span>

        <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--color-text)]">
          Halaman Tidak Ditemukan
        </h1>

        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
          Mohon maaf, halaman yang Anda cari tidak tersedia. Halaman mungkin telah dipindahkan atau tautan yang Anda buka tidak valid.
        </p>

        <div className="pt-2 flex justify-center">
          <Button href="/" variant="primary" className="min-h-[44px]">
            <Home className="w-4 h-4 mr-1.5" aria-hidden="true" />
            <span>Kembali ke Beranda</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
