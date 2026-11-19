import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { DemoButtons } from './DemoButtons';

export default function DemoPage() {
  if (process.env.DEMO_MODE !== 'true') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Tombol kembali ke Login */}
        <div className="mb-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Masuk</span>
          </Link>
        </div>

        {/* Card Header */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FAF0E6] text-[var(--color-accent)] border border-[#F5D8C7]">
              <Sparkles className="w-3 h-3" />
              <span>Mode Evaluasi & Demo</span>
            </span>
          </div>

          <h1 className="font-display text-2xl font-bold text-[var(--color-text)]">
            Coba Aplikasi Tanpa Akun
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5 mb-6 leading-relaxed">
            Pilih salah satu peran pengguna di bawah untuk melihat tampilan antarmuka dan alur sistem sesuai perannya.
          </p>

          <DemoButtons />
        </div>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          Data pada mode demo berisi data dummy sekolah SMK yang terisolasi.
        </p>
      </div>
    </div>
  );
}
