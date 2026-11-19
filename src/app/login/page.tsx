import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorKey = params.error;

  let errorMessage: string | null = null;
  if (errorKey === 'not_registered') {
    errorMessage =
      'Email Google Anda belum terdaftar di sistem. Silakan hubungi admin sekolah untuk didaftarkan.';
  } else if (errorKey === 'inactive') {
    errorMessage =
      'Akun Anda sedang dinonaktifkan. Silakan hubungi tata usaha atau admin sekolah.';
  } else if (errorKey === 'unknown') {
    errorMessage = 'Terjadi gangguan saat proses masuk. Silakan coba kembali.';
  }

  async function handleGoogleSignIn() {
    'use server';
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      redirect('/login?error=unknown');
    }

    if (data.url) {
      redirect(data.url);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(var(--color-primary) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />

      <div className="w-full max-w-md relative z-10">
        {/* Tombol kembali ke Landing Page */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Utama</span>
          </Link>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-primary)] text-white shadow-sm mb-4">
            <span className="font-display font-bold text-2xl">S</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
            Sekolahku
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5 max-w-xs mx-auto leading-relaxed">
            Sistem sekolah sederhana dan nyaman untuk guru, murid, dan orang tua.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-[10px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-3 text-center">
                Masuk dengan Akun Resmi
              </p>
              <form action={handleGoogleSignIn}>
                <button
                  type="submit"
                  className="w-full min-h-[48px] px-4 py-3 rounded-[10px] border border-[#DDD7CD] bg-white hover:bg-[#FAF7F2] text-[var(--color-text)] font-semibold text-sm sm:text-base flex items-center justify-center gap-3 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer"
                >
                  {/* Google SVG Icon */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Masuk dengan Google</span>
                </button>
              </form>
            </div>

            <p className="text-xs text-center text-[var(--color-text-muted)] pt-2 leading-relaxed">
              Hanya email yang sudah didaftarkan oleh sekolah yang dapat masuk.
            </p>
          </div>

          {process.env.DEMO_MODE === 'true' && (
            <div className="mt-8 pt-6 border-t border-[#F0EBE1] text-center">
              <span className="text-xs text-[var(--color-text-muted)] block mb-2">
                Sedang mengevaluasi aplikasi?
              </span>
              <Link
                href="/demo"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded-[4px]"
              >
                <span>Coba Mode Demo Tanpa Akun</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-8">
          SMK Sekolahku &bull; Terbuka, Ramah, & Bersahabat
        </p>
      </div>
    </div>
  );
}
