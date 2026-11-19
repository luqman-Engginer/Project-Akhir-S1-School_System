'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  GraduationCap,
  BookOpen,
  HeartHandshake,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface DemoRoleConfig {
  key: string;
  roleTitle: string;
  demoName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

export function DemoButtons() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoRoles: DemoRoleConfig[] = [
    {
      key: 'admin',
      roleTitle: 'Admin Sekolah',
      demoName: 'Bu Siti Aminah',
      description: 'Kelola data pengguna, rombel kelas, mapel, dan siaran pengumuman.',
      icon: ShieldCheck,
      iconBg: 'bg-stone-100',
      iconColor: 'text-stone-800',
    },
    {
      key: 'teacher',
      roleTitle: 'Guru & Wali Kelas',
      demoName: 'Pak Dedi Kurniawan, S.Kom',
      description: 'Wali Kelas XI RPL 1. Catat absensi harian, nilai tugas, dan balas pesan ortu.',
      icon: GraduationCap,
      iconBg: 'bg-[#E8F1EE]',
      iconColor: 'text-[var(--color-primary)]',
    },
    {
      key: 'student',
      roleTitle: 'Murid SMK',
      demoName: 'Raka Pratama (XI RPL 1)',
      description: 'Cek tugas hari ini, lihat jadwal dan rekap nilai, serta tanya guru.',
      icon: BookOpen,
      iconBg: 'bg-[#EBF2F7]',
      iconColor: 'text-[#3D5A80]',
    },
    {
      key: 'parent',
      roleTitle: 'Orang Tua / Wali',
      demoName: 'Pak Hendra Wijaya (Ortu Raka)',
      description: 'Pantau kehadiran anak, izin sakit, dan konsultasi dengan wali kelas.',
      icon: HeartHandshake,
      iconBg: 'bg-[#FAF0E6]',
      iconColor: 'text-[var(--color-accent)]',
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

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal masuk akun demo');
        setLoadingRole(null);
        return;
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
        router.refresh();
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
          className="p-4 rounded-[10px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-sm mb-4"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {demoRoles.map((role) => {
          const Icon = role.icon;
          const isLoading = loadingRole === role.key;

          return (
            <button
              key={role.key}
              type="button"
              disabled={loadingRole !== null}
              onClick={() => handleDemoLogin(role.key)}
              className="group text-left p-4 rounded-[12px] bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[#FAF7F2] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-start justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${role.iconBg} ${role.iconColor}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base text-[var(--color-text)]">
                      {role.roleTitle}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] font-normal">
                      &bull; {role.demoName}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1 leading-snug">
                    {role.description}
                  </p>
                </div>
              </div>

              <div className="shrink-0 pt-1 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
                ) : (
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
