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
} from 'lucide-react';

interface DemoRoleConfig {
  key: string;
  roleTitle: string;
  demoName: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  borderHover: string;
}

export function DemoButtons() {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoRoles: DemoRoleConfig[] = [
    {
      key: 'teacher',
      roleTitle: 'Guru & Wali Kelas',
      demoName: 'Pak Dedi Kurniawan, S.Kom',
      badge: 'XI RPL 1',
      description: 'Isi absensi harian 1 menit, kelola tugas & nilai, serta balas pesan ortu.',
      icon: GraduationCap,
      iconBg: 'bg-emerald-100 border border-emerald-300',
      iconColor: 'text-emerald-900',
      borderHover: 'hover:border-emerald-700 hover:ring-2 hover:ring-emerald-700/10',
    },
    {
      key: 'student',
      roleTitle: 'Murid SMK',
      demoName: 'Raka Pratama',
      badge: 'Murid Aktif',
      description: 'Cek tugas hari ini, lihat jadwal & rekap nilai transparan, dan izin sakit.',
      icon: BookOpen,
      iconBg: 'bg-sky-100 border border-sky-300',
      iconColor: 'text-sky-900',
      borderHover: 'hover:border-sky-700 hover:ring-2 hover:ring-sky-700/10',
    },
    {
      key: 'parent',
      roleTitle: 'Orang Tua / Wali',
      demoName: 'Pak Hendra Wijaya',
      badge: 'Ortu Raka',
      description: 'Pantau kehadiran anak, ajukan izin sakit resmi, dan chat dengan wali kelas.',
      icon: HeartHandshake,
      iconBg: 'bg-amber-100 border border-amber-300',
      iconColor: 'text-amber-900',
      borderHover: 'hover:border-amber-700 hover:ring-2 hover:ring-amber-700/10',
    },
    {
      key: 'admin',
      roleTitle: 'Admin Sekolah',
      demoName: 'Bu Siti Aminah',
      badge: 'Administrator',
      description: 'Kelola data pengguna, rombel kelas, mapel, dan siaran pengumuman.',
      icon: ShieldCheck,
      iconBg: 'bg-indigo-100 border border-indigo-300',
      iconColor: 'text-indigo-900',
      borderHover: 'hover:border-indigo-700 hover:ring-2 hover:ring-indigo-700/10',
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
        // Gunakan full-page reload agar seluruh cookie sesi terbawa ke server
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

      <div className="grid grid-cols-1 gap-3.5">
        {demoRoles.map((role) => {
          const Icon = role.icon;
          const isLoading = loadingRole === role.key;

          return (
            <button
              key={role.key}
              type="button"
              disabled={loadingRole !== null}
              onClick={() => handleDemoLogin(role.key)}
              className={`group text-left p-4 sm:p-4.5 rounded-xl bg-stone-50/70 border-2 border-stone-200/90 transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between gap-3 shadow-2xs ${role.borderHover}`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${role.iconBg} ${role.iconColor}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-stone-900">
                      {role.roleTitle}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-700">
                      {role.badge}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-stone-700 mt-0.5">
                    {role.demoName}
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-snug line-clamp-2">
                    {role.description}
                  </p>
                </div>
              </div>

              <div className="shrink-0 pl-2 text-stone-400 group-hover:text-stone-900 transition-colors">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#144D40]" />
                ) : (
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
