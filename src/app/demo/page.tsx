import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, School, ShieldCheck, Home } from 'lucide-react';
import { DemoButtons } from './DemoButtons';

export default function DemoPage() {
  if (process.env.DEMO_MODE !== 'true') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col font-sans">
      {/* Header Navigasi Atas */}
      <header className="w-full border-b border-stone-200/80 bg-white/70 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-[#144D40] text-white flex items-center justify-center font-display font-bold text-lg shadow-xs ring-2 ring-[#144D40]/15">
              S
            </span>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-base text-stone-900 leading-tight group-hover:text-[#144D40] transition-colors">
                Sekolahku
              </span>
              <span className="text-[11px] text-stone-500 font-medium">
                Portal Evaluasi SMK
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#144D40] transition-colors py-2 px-3 rounded-lg hover:bg-stone-100 min-h-[40px]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#144D40]" />
              <span>Halaman Masuk</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#144D40] transition-colors py-2 px-3 rounded-lg hover:bg-stone-100 min-h-[40px]"
            >
              <Home className="w-3.5 h-3.5 text-stone-500" />
              <span>Beranda</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-10 sm:py-14">
        <div className="w-full max-w-4xl">
          {/* Header Banner */}
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold mb-4 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Mode Evaluasi & Demo Instan</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900 tracking-tight leading-tight">
              Coba Aplikasi Tanpa Akun
            </h1>
            <p className="text-sm sm:text-base text-stone-600 mt-3 leading-relaxed font-medium">
              Pilih salah satu peran pengguna di bawah untuk langsung mencoba antarmuka, alur kerja, dan data nyata SMK Sekolahku.
            </p>
          </div>

          {/* Kotak Pilihan Peran Demo (2 Kolom di Tablet/Desktop) */}
          <div className="bg-white border-2 border-stone-200/90 rounded-2xl p-5 sm:p-8 shadow-sm">
            <DemoButtons />
          </div>

          {/* Catatan Bawah */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 mt-6 px-2 font-medium">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-stone-400 shrink-0" />
              <span>Data contoh telah disinkronkan dengan rombel XI RPL 1 dan kurikulum SMK.</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-600">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Sesi demo diisolasi secara aman</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Minimal */}
      <footer className="py-6 border-t border-stone-200/70 text-center text-xs text-stone-500 font-medium">
        SMK Sekolahku &bull; Terbuka, Ramah, & Bersahabat
      </footer>
    </div>
  );
}
