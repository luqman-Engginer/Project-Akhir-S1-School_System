'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  Users,
  GraduationCap,
  Heart,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  updateUserAction,
  linkParentStudentAction,
  unlinkParentStudentAction,
  assignStudentClassAction,
  removeStudentClassAction,
} from '@/lib/actions/admin';
import type { UserRole } from '@/types/database';

interface UserDetailManagerProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    phone: string | null;
    isActive: boolean;
    hasLoggedIn: boolean;
  };
  currentClass?: { id: string; name: string } | null;
  availableClasses: Array<{ id: string; name: string }>;
  linkedParents: Array<{ id: string; fullName: string; phone: string | null }>;
  availableParents: Array<{ id: string; fullName: string }>;
  linkedChildren: Array<{ id: string; fullName: string; className: string | null }>;
  availableStudents: Array<{ id: string; fullName: string; className: string | null }>;
  teachings: Array<{ id: string; subjectName: string; className: string }>;
}

export function UserDetailManager({
  user,
  currentClass,
  availableClasses,
  linkedParents,
  availableParents,
  linkedChildren,
  availableStudents,
  teachings,
}: UserDetailManagerProps) {
  const router = useRouter();
  const { success, error: showToastError } = useToast();

  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || '');
  const [email, setEmail] = useState(user.email);
  const [isActive, setIsActive] = useState(user.isActive);

  const [loading, setLoading] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  // Relasi action state
  const [selectedParentToLink, setSelectedParentToLink] = useState(availableParents[0]?.id || '');
  const [selectedChildToLink, setSelectedChildToLink] = useState(availableStudents[0]?.id || '');
  const [selectedClassToAssign, setSelectedClassToAssign] = useState(availableClasses[0]?.id || '');
  const [relLoading, setRelLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await updateUserAction(user.id, {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        isActive,
        newEmail: !user.hasLoggedIn ? email.trim() : undefined,
      });

      if (!res.success) {
        showToastError(res.error || 'Gagal memperbarui profil.');
      } else {
        success('Data pengguna berhasil diperbarui!');
        router.refresh();
      }
    } catch {
      showToastError('Terjadi gangguan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (targetActive: boolean) => {
    setLoading(true);
    setShowDeactivateConfirm(false);
    try {
      const res = await updateUserAction(user.id, {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        isActive: targetActive,
      });

      if (!res.success) {
        showToastError(res.error || 'Gagal mengubah status aktif pengguna.');
      } else {
        setIsActive(targetActive);
        success(
          targetActive
            ? 'Akun pengguna berhasil diaktifkan kembali.'
            : 'Akun pengguna berhasil dinonaktifkan.'
        );
        router.refresh();
      }
    } catch {
      showToastError('Terjadi gangguan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  // Handler Murid: Hubungkan ke Ortu
  const handleLinkParent = async () => {
    if (!selectedParentToLink) return;
    setRelLoading(true);
    try {
      const res = await linkParentStudentAction(selectedParentToLink, user.id);
      if (res.success) {
        success('Orang tua berhasil ditautkan ke murid ini.');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal menautkan orang tua.');
      }
    } finally {
      setRelLoading(false);
    }
  };

  const handleUnlinkParent = async (parentId: string) => {
    setRelLoading(true);
    try {
      const res = await unlinkParentStudentAction(parentId, user.id);
      if (res.success) {
        success('Hubungan orang tua berhasil dilepas.');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal melepas hubungan.');
      }
    } finally {
      setRelLoading(false);
    }
  };

  // Handler Ortu: Hubungkan ke Anak
  const handleLinkChild = async () => {
    if (!selectedChildToLink) return;
    setRelLoading(true);
    try {
      const res = await linkParentStudentAction(user.id, selectedChildToLink);
      if (res.success) {
        success('Anak murid berhasil ditautkan ke akun orang tua ini.');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal menautkan anak.');
      }
    } finally {
      setRelLoading(false);
    }
  };

  const handleUnlinkChild = async (childId: string) => {
    setRelLoading(true);
    try {
      const res = await unlinkParentStudentAction(user.id, childId);
      if (res.success) {
        success('Hubungan anak berhasil dilepas.');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal melepas hubungan.');
      }
    } finally {
      setRelLoading(false);
    }
  };

  // Handler Murid: Masuk Kelas
  const handleAssignClass = async () => {
    if (!selectedClassToAssign) return;
    setRelLoading(true);
    try {
      const res = await assignStudentClassAction(user.id, selectedClassToAssign);
      if (res.success) {
        success('Siswa berhasil ditempatkan ke kelas.');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal menempatkan siswa.');
      }
    } finally {
      setRelLoading(false);
    }
  };

  const handleRemoveClass = async (classId: string) => {
    setRelLoading(true);
    try {
      const res = await removeStudentClassAction(user.id, classId);
      if (res.success) {
        success('Siswa berhasil dikeluarkan dari kelas.');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal mengeluarkan siswa dari kelas.');
      }
    } finally {
      setRelLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header & Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/pengguna"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Kembali ke Daftar Pengguna</span>
        </Link>

        {isActive ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setShowDeactivateConfirm(true)}
            disabled={loading}
          >
            Nonaktifkan Pengguna
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleToggleActive(true)}
            disabled={loading}
          >
            Aktifkan Kembali Akun
          </Button>
        )}
      </div>

      {/* Bagian 1: Data Profil Pokok */}
      <form onSubmit={handleUpdateProfile} className="p-6 rounded-[16px] bg-white border border-[var(--color-border)] shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="text-lg font-bold font-display text-[var(--color-text)]">
              Informasi Akun
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              ID Pengguna: {user.id}
            </p>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              isActive
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {isActive ? 'Akun Aktif' : 'Akun Nonaktif'}
          </span>
        </div>

        {/* Nama Lengkap */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--color-text)]">
            Nama Lengkap
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value.slice(0, 80))}
            className="w-full p-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] min-h-[44px]"
            required
            disabled={loading}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[var(--color-text)]">
              Alamat Email
            </label>
            {user.hasLoggedIn && (
              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Terkunci (sudah pernah login)</span>
              </span>
            )}
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={user.hasLoggedIn || loading}
            className={`w-full p-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] min-h-[44px] ${
              user.hasLoggedIn
                ? 'bg-stone-100 text-stone-500 cursor-not-allowed'
                : 'bg-[var(--color-surface)] text-[var(--color-text)]'
            }`}
          />
        </div>

        {/* Nomor HP */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--color-text)]">
            Nomor Telepon / WhatsApp
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="081234567890"
            disabled={loading}
            className="w-full p-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] min-h-[44px]"
          />
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" disabled={loading} className="min-h-[44px]">
            {loading ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>

      {/* ============================================================ */}
      {/* SEKSI KHUSUS MURID: KELAS & ORANG TUA                        */}
      {/* ============================================================ */}
      {user.role === 'student' && (
        <div className="space-y-6">
          {/* Kelas Siswa */}
          <div className="p-6 rounded-[16px] bg-white border border-[var(--color-border)] shadow-xs space-y-4">
            <h3 className="text-base font-bold font-display text-[var(--color-text)] flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[var(--color-primary)]" />
              <span>Kelas Siswa</span>
            </h3>

            {currentClass ? (
              <div className="p-3.5 rounded-[10px] bg-[#FAF7F2] border border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--color-text-muted)] block">Terdaftar di kelas:</span>
                  <span className="text-sm font-bold text-[var(--color-text)]">
                    Kelas {currentClass.name}
                  </span>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveClass(currentClass.id)}
                  disabled={relLoading}
                >
                  Keluarkan dari Kelas
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Siswa ini belum terdaftar di kelas mana pun.</span>
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedClassToAssign}
                    onChange={(e) => setSelectedClassToAssign(e.target.value)}
                    className="flex-1 p-2 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
                    disabled={relLoading}
                  >
                    {availableClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name}
                      </option>
                    ))}
                  </select>
                  <Button variant="primary" size="sm" onClick={handleAssignClass} disabled={relLoading}>
                    Masukkan ke Kelas
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Orang Tua Tertaut */}
          <div className="p-6 rounded-[16px] bg-white border border-[var(--color-border)] shadow-xs space-y-4">
            <h3 className="text-base font-bold font-display text-[var(--color-text)] flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#C8643B]" />
              <span>Orang Tua / Wali Tertaut</span>
            </h3>

            {linkedParents.length > 0 ? (
              <div className="space-y-2">
                {linkedParents.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-[8px] bg-[#FAF7F2] border border-[var(--color-border)] flex items-center justify-between text-xs sm:text-sm"
                  >
                    <div>
                      <span className="font-bold text-[var(--color-text)] block">{p.fullName}</span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">{p.phone || 'Tanpa no. HP'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlinkParent(p.id)}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                      disabled={relLoading}
                    >
                      Lepas Hubungan
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-[8px] border border-amber-200">
                Belum ada akun orang tua yang terhubung dengan murid ini.
              </p>
            )}

            {availableParents.length > 0 && (
              <div className="pt-2 border-t border-[var(--color-border)] flex gap-2">
                <select
                  value={selectedParentToLink}
                  onChange={(e) => setSelectedParentToLink(e.target.value)}
                  className="flex-1 p-2 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
                  disabled={relLoading}
                >
                  {availableParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" size="sm" onClick={handleLinkParent} disabled={relLoading}>
                  Hubungkan Orang Tua
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SEKSI KHUSUS ORANG TUA: ANAK TERTAUT                         */}
      {/* ============================================================ */}
      {user.role === 'parent' && (
        <div className="p-6 rounded-[16px] bg-white border border-[var(--color-border)] shadow-xs space-y-4">
          <h3 className="text-base font-bold font-display text-[var(--color-text)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Anak Murid Tertaut</span>
          </h3>

          {linkedChildren.length > 0 ? (
            <div className="space-y-2">
              {linkedChildren.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-[8px] bg-[#FAF7F2] border border-[var(--color-border)] flex items-center justify-between text-xs sm:text-sm"
                >
                  <div>
                    <span className="font-bold text-[var(--color-text)] block">{c.fullName}</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {c.className ? `Kelas ${c.className}` : 'Belum memiliki kelas'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnlinkChild(c.id)}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                    disabled={relLoading}
                  >
                    Lepas Hubungan
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-[8px] border border-amber-200">
              Belum ada anak murid yang tertaut ke akun orang tua ini.
            </p>
          )}

          {availableStudents.length > 0 && (
            <div className="pt-2 border-t border-[var(--color-border)] flex gap-2">
              <select
                value={selectedChildToLink}
                onChange={(e) => setSelectedChildToLink(e.target.value)}
                className="flex-1 p-2 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
                disabled={relLoading}
              >
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} {s.className ? `(${s.className})` : '(Tanpa kelas)'}
                  </option>
                ))}
              </select>
              <Button variant="secondary" size="sm" onClick={handleLinkChild} disabled={relLoading}>
                Hubungkan ke Anak
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SEKSI KHUSUS GURU: MAPEL YANG DIAMPU                         */}
      {/* ============================================================ */}
      {user.role === 'teacher' && (
        <div className="p-6 rounded-[16px] bg-white border border-[var(--color-border)] shadow-xs space-y-4">
          <h3 className="text-base font-bold font-display text-[var(--color-text)] flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Mata Pelajaran yang Diampu</span>
          </h3>

          {teachings.length > 0 ? (
            <div className="space-y-2">
              {teachings.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-[8px] bg-[#FAF7F2] border border-[var(--color-border)] text-xs sm:text-sm font-semibold text-[var(--color-text)] flex items-center justify-between"
                >
                  <span>{t.subjectName}</span>
                  <span className="text-xs font-normal text-[var(--color-text-muted)]">Kelas {t.className}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)] italic">
              Guru ini belum memiliki penugasan mengajar di kelas mana pun. Anda dapat mengaturnya di menu Kelas & Mapel.
            </p>
          )}
        </div>
      )}

      {/* Modal Dialog Konfirmasi Nonaktifkan */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-[var(--color-border)] rounded-[16px] shadow-lg max-w-sm w-full p-5 space-y-4">
            <h3 className="font-bold font-display text-base text-[var(--color-text)]">
              Nonaktifkan Akun Pengguna?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
              <strong>{user.fullName}</strong> tidak akan bisa masuk lagi ke aplikasi Sekolahku sampai akun diaktifkan kembali. Riwayat data akademik tetap tersimpan aman.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeactivateConfirm(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleToggleActive(false)}
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Ya, Nonaktifkan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

