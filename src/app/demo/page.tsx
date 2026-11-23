import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, School } from 'lucide-react';
import { DemoButtons } from './DemoButtons';

export default function DemoPage() {
  if (process.env.DEMO_MODE !== 'true') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col justify-center items-center px-4 py-12 font-sans relative">
      <div className="w-full max-w-lg">
        {/* Tombol kembali ke Login */}
        <div className="mb-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#144D40] transition-colors py-1 px-2.5 rounded-lg hover:bg-stone-200/50"
          >
            <ArrowLeft className="w-4 h-4 text-[#144D40]" />
            <span>Kembali ke Halaman Masuk</span>
          </Link>
        </div>

        {/* Card Header */}
        <div className="bg-white border-2 border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-900 border-2 border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Mode Evaluasi & Demo Instan</span>
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Coba Aplikasi Tanpa Akun
          </h1>
          <p className="text-sm text-stone-600 mt-2 mb-6 leading-relaxed font-medium">
            Pilih salah satu peran pengguna di bawah untuk melihat antarmuka dan alur sistem sesuai perannya secara langsung.
          </p>

          <DemoButtons />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-stone-500 mt-6 font-medium">
          <School className="w-3.5 h-3.5 text-stone-400" />
          <span>Data pada mode demo berisi data dummy SMK yang siap dievaluasi.</span>
        </div>
      </div>
    </div>
  );
}
