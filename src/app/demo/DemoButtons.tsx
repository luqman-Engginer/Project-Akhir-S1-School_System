'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  BookOpen,
  HeartHandshake,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface DemoRoleConfig {
  key: string;
  roleTitle: string;
  demoName: string;
  badge: string;
  description: string;
  highlights: string[];
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  accentBorder: string;
  buttonClass: string;
}

export function DemoButtons() {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoRoles: DemoRoleConfig[] = [
    {
      key: 'teacher',
      roleTitle: 'Guru & Wali Kelas',
      demoName: 'Pak Dedi Kurniawan, S.Kom',
      badge: 'Wali XI RPL 1',
      description: 'Isi absensi harian 1 menit, kelola tugas & nilai, serta balas pesan konsultasi ortu.',
      highlights: ['Presensi murid per rombel', 'Buat & periksa tugas harian', 'Konfirmasi izin sakit'],
      icon: GraduationCap,
      iconBg: 'bg-emerald-100 border border-emerald-300',
      iconColor: 'text-emerald-950',
      accentBorder: 'hover:border-emerald-700 hover:ring-2 hover:ring-emerald-700/15',
      buttonClass: 'bg-emerald-800 text-white hover:bg-emerald-900',
    },
    {
      key: 'student',
      roleTitle: 'Murid SMK',
      demoName: 'Raka Pratama',
      badge: 'Kelas XI RPL 1',
      description: 'Cek tugas hari ini, lihat jadwal pelajaran, pantau rekap nilai, dan ajukan izin sakit.',
      highlights: ['Tugas dengan batas waktu jelas', 'Jadwal sesi & nilai transparan', 'Formulir izin berlampiran'],
      icon: BookOpen,
      iconBg: 'bg-sky-100 border border-sky-300',
      iconColor: 'text-sky-950',
      accentBorder: 'hover:border-sky-700 hover:ring-2 hover:ring-sky-700/15',
      buttonClass: 'bg-sky-800 text-white hover:bg-sky-900',
    },
    {
      key: 'parent',
      roleTitle: 'Orang Tua / Wali',
      demoName: 'Pak Hendra Wijaya',
      badge: 'Orang Tua Raka',
      description: 'Pantau kehadiran anak, ajukan surat sakit resmi berlampiran, dan chat dengan wali kelas.',
      highlights: ['Kabar kehadiran jam pertama', 'Chat privat dengan wali kelas', 'Pantau akumulasi nilai'],
      icon: HeartHandshake,
      iconBg: 'bg-amber-100 border border-amber-300',
      iconColor: 'text-amber-950',
      accentBorder: 'hover:border-amber-700 hover:ring-2 hover:ring-amber-700/15',
      buttonClass: 'bg-amber-800 text-white hover:bg-amber-900',
    },
    {
      key: 'admin',
      roleTitle: 'Admin Sekolah',
      demoName: 'Bu Siti Aminah',
      badge: 'Administrator',
      description: 'Kelola data pengguna, penugasan guru, rombel kelas, mata pelajaran, dan siaran pengumuman.',
      highlights: ['Manajemen akun 4 peran', 'Distribusi jadwal & rombel', 'Siaran pengumuman terpusat'],
      icon: ShieldCheck,
      iconBg: 'bg-indigo-100 border border-indigo-300',
      iconColor: 'text-indigo-950',
      accentBorder: 'hover:border-indigo-700 hover:ring-2 hover:ring-indigo-700/15',
      buttonClass: 'bg-indigo-800 text-white hover:bg-indigo-900',
    },
  ];

  async function handleDemoLogin(role: string) {
    setLoadingRole(role);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal masuk akun demo. Silakan coba kembali.');
        setLoadingRole(null);
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Terjadi gangguan jaringan, coba lagi.'
      );
      setLoadingRole(null);
    }
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-900 text-sm flex items-start gap-2.5 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Grid 2 Kolom Responsif */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {demoRoles.map((role) => {
          const Icon = role.icon;
          const isLoading = loadingRole === role.key;

          return (
            <div
              key={role.key}
              className={`rounded-xl bg-[#FAF7F2]/60 border-2 border-stone-200/90 p-5 sm:p-6 flex flex-col justify-between transition-all duration-150 shadow-2xs ${role.accentBorder}`}
            >
              <div>
                {/* Header Kartu */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${role.iconBg} ${role.iconColor}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-700 shadow-2xs">
                    {role.badge}
                  </span>
                </div>

                {/* Judul & Nama Profil */}
                <h2 className="font-display font-extrabold text-lg text-stone-900">
                  {role.roleTitle}
                </h2>
                <div className="text-xs font-bold text-stone-600 mt-0.5">
                  Profil: {role.demoName}
                </div>

                <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed font-medium">
                  {role.description}
                </p>

                {/* Fitur Utama */}
                <ul className="mt-4 pt-3 border-t border-stone-200/80 space-y-1.5">
                  {role.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-stone-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tombol Aksi */}
              <button
                type="button"
                disabled={loadingRole !== null}
                onClick={() => handleDemoLogin(role.key)}
                className={`mt-5 w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${role.buttonClass}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyiapkan Dasbor...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk sebagai {role.roleTitle.split('&')[0].trim()}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
