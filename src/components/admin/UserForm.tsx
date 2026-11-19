'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserPlus,
  Mail,
  User,
  Phone,
  Shield,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createAdminUserAction } from '@/lib/actions/admin';
import { validateGmail } from '@/lib/email';
import { normalizeIdPhone } from '@/lib/whatsapp';
import type { UserRole } from '@/types/database';

export function UserForm() {
  const router = useRouter();
  const { success, error: showToastError } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [phone, setPhone] = useState('');
  const [isHomeroom, setIsHomeroom] = useState(false);

  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdProfile, setCreatedProfile] = useState<{ id: string; role: UserRole; name: string } | null>(null);

  // Validasi email realtime saat blur atau ketik
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailSuggestion(null);
    setEmailError(null);
  };

  const handleEmailBlur = () => {
    if (!email.trim()) return;
    const res = validateGmail(email);
    if (!res.success) {
      setEmailError(res.error);
      if (res.suggestion) {
        setEmailSuggestion(res.suggestion);
      }
    } else {
      setEmailError(null);
      setEmailSuggestion(null);
    }
  };

  const applySuggestion = () => {
    if (emailSuggestion) {
      setEmail(emailSuggestion);
      setEmailSuggestion(null);
      setEmailError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setErrorMessage('Nama lengkap minimal 2 karakter.');
      return;
    }

    const emailCheck = validateGmail(trimmedEmail);
    if (!emailCheck.success) {
      setErrorMessage(emailCheck.error);
      if (emailCheck.suggestion) setEmailSuggestion(emailCheck.suggestion);
      return;
    }

    let normalizedPhone: string | null = null;
    if (phone.trim()) {
      normalizedPhone = normalizeIdPhone(phone.trim());
      if (!normalizedPhone) {
        setErrorMessage('Format nomor HP tidak valid (harus diawali 08 atau 628 dengan 11-14 digit).');
        return;
      }
    }

    setLoading(true);

    try {
      const res = await createAdminUserAction({
        full_name: trimmedName,
        email: emailCheck.email,
        role,
        phone: normalizedPhone,
      });

      if (!res.success || !res.profile) {
        setErrorMessage(res.error || 'Gagal mendaftarkan pengguna baru.');
        setLoading(false);
        return;
      }

      success(`Pengguna ${res.profile.full_name} berhasil ditambahkan!`);
      setCreatedProfile({
        id: res.profile.id,
        role: res.profile.role as UserRole,
        name: res.profile.full_name,
      });
    } catch {
      setErrorMessage('Terjadi gangguan sistem saat menambahkan pengguna.');
    } finally {
      setLoading(false);
    }
  };

  // Tampilan Sukses dengan Panduan Langkah Berikutnya
  if (createdProfile) {
    let nextStepText = '';
    let nextStepHref = '/admin/pengguna';
    let nextStepButton = 'Selesai & Kembali ke Pengguna';

    if (createdProfile.role === 'student') {
      nextStepText = `Masukkan ${createdProfile.name} ke kelasnya sekarang di menu Kelas & Mapel agar ananda dapat menerima jadwal dan tugas KBM.`;
      nextStepHref = '/admin/kelas-mapel';
      nextStepButton = 'Atur Kelas Siswa Ini Sekarang &rarr;';
    } else if (createdProfile.role === 'parent') {
      nextStepText = `Hubungkan akun orang tua ${createdProfile.name} dengan anak muridnya agar dapat memantau kehadiran dan perkembangan belajar.`;
      nextStepHref = `/admin/pengguna/${createdProfile.id}`;
      nextStepButton = 'Hubungkan ke Anak Sekarang &rarr;';
    } else if (createdProfile.role === 'teacher') {
      nextStepText = `Atur mata pelajaran yang diampu oleh ${createdProfile.name} di menu Kelas & Mapel.`;
      nextStepHref = '/admin/kelas-mapel';
      nextStepButton = 'Atur Mengajar Guru Ini Sekarang &rarr;';
    }

    return (
      <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-[16px] bg-white border border-[var(--color-border)] shadow-xs text-center space-y-5 animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold font-display text-[var(--color-text)]">
            Akun Berhasil Ditambahkan!
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
            <strong>{createdProfile.name}</strong> telah terdaftar di database whitelist Sekolahku.
          </p>
        </div>

        <div className="p-4 rounded-[12px] bg-[#FAF7F2] border border-[var(--color-border)] text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Langkah Berikutnya yang Disarankan</span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text)] leading-relaxed">
            {nextStepText}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button href={nextStepHref} variant="primary" className="w-full sm:w-auto min-h-[44px]">
            <span>{nextStepButton}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto min-h-[44px]"
            onClick={() => {
              setCreatedProfile(null);
              setFullName('');
              setEmail('');
              setPhone('');
            }}
          >
            <span>Tambah Pengguna Lain</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto bg-white p-6 sm:p-7 rounded-[16px] border border-[var(--color-border)] shadow-xs">
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-[12px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-xs sm:text-sm flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Pendaftaran belum berhasil:</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Nama Lengkap */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-semibold text-[var(--color-text)]">
          Nama Lengkap
        </label>
        <div className="relative">
          <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value.slice(0, 80))}
            placeholder="Contoh: Budi Santoso, S.Kom."
            className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] min-h-[44px]"
            disabled={loading}
            required
          />
        </div>
      </div>

      {/* Email Gmail */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-semibold text-[var(--color-text)]">
          Alamat Email Gmail
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={handleEmailBlur}
            placeholder="nama@gmail.com"
            className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] min-h-[44px]"
            disabled={loading}
            required
          />
        </div>

        {/* Saran Koreksi Typo Domain */}
        {emailSuggestion && (
          <div className="p-2.5 rounded-[8px] bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
            <span>
              Maksud Anda: <strong>{emailSuggestion}</strong>?
            </span>
            <button
              type="button"
              onClick={applySuggestion}
              className="text-xs font-bold text-[var(--color-primary)] hover:underline shrink-0"
            >
              Gunakan saran ini
            </button>
          </div>
        )}

        {emailError && !emailSuggestion && (
          <p className="text-xs text-rose-600">{emailError}</p>
        )}
      </div>

      {/* Pilihan Peran */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-semibold text-[var(--color-text)]">
          Peran Pengguna (Role)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'student', label: 'Murid' },
            { id: 'parent', label: 'Orang Tua' },
            { id: 'teacher', label: 'Guru' },
            { id: 'admin', label: 'Admin' },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id as UserRole)}
              className={`py-2 px-3 rounded-[8px] text-xs sm:text-sm font-semibold border transition-colors min-h-[44px] ${
                role === r.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-stone-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nomor Telepon / WhatsApp */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-semibold text-[var(--color-text)]">
          Nomor Telepon / WhatsApp (Opsional)
        </label>
        <div className="relative">
          <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="081234567890"
            className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] min-h-[44px]"
            disabled={loading}
          />
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Gunakan format nomor HP Indonesia (otomatis dinormalisasi ke awalan 628).
        </p>
      </div>

      <div className="pt-3">
        <Button
          type="submit"
          variant="primary"
          className="w-full min-h-[44px]"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menambahkan Pengguna...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              <span>Daftarkan Pengguna Baru</span>
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
