'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Pin, Send, Trash2, Loader2, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  createAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
} from '@/lib/actions/announcements';
import type { UserRole } from '@/types/database';

interface ClassOption {
  id: string;
  name: string;
}

interface AnnouncementFormProps {
  currentRole: UserRole;
  classes: ClassOption[];
  initialData?: {
    id: string;
    title: string;
    body: string;
    target: 'all' | 'class' | 'parents';
    classId: string | null;
    isPinned: boolean;
  };
  backHref: string;
}

export function AnnouncementForm({
  currentRole,
  classes,
  initialData,
  backHref,
}: AnnouncementFormProps) {
  const router = useRouter();
  const { success, error: showToastError } = useToast();

  const isEdit = Boolean(initialData);

  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [target, setTarget] = useState<'all' | 'class' | 'parents'>(
    initialData?.target || (currentRole === 'admin' ? 'all' : 'class')
  );
  const [classId, setClassId] = useState<string>(
    initialData?.classId || classes[0]?.id || ''
  );
  const [isPinned, setIsPinned] = useState(initialData?.isPinned || false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Perkiraan teks penerima
  const targetSummary =
    target === 'all'
      ? 'Seluruh murid, orang tua, dan guru di sekolah'
      : target === 'parents'
        ? 'Seluruh orang tua / wali murid'
        : `Siswa, orang tua, dan guru kelas ${classes.find((c) => c.id === classId)?.name || ''}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (trimmedTitle.length < 3) {
      setErrorMessage('Judul pengumuman minimal 3 karakter.');
      return;
    }
    if (trimmedBody.length < 10) {
      setErrorMessage('Isi pengumuman minimal 10 karakter.');
      return;
    }
    if (target === 'class' && !classId) {
      setErrorMessage('Pilih kelas target pengumuman.');
      return;
    }

    setLoading(true);

    try {
      if (isEdit && initialData) {
        const res = await updateAnnouncementAction(initialData.id, {
          title: trimmedTitle,
          body: trimmedBody,
          target,
          classId: target === 'class' ? classId : null,
          isPinned: currentRole === 'admin' ? isPinned : false,
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Gagal memperbarui pengumuman.');
          setLoading(false);
          return;
        }

        success('Pengumuman berhasil diperbarui!');
        router.push(backHref);
      } else {
        const res = await createAnnouncementAction({
          title: trimmedTitle,
          body: trimmedBody,
          target,
          classId: target === 'class' ? classId : null,
          isPinned: currentRole === 'admin' ? isPinned : false,
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Gagal membuat pengumuman.');
          setLoading(false);
          return;
        }

        success(`Pengumuman dikirim ke ${res.recipientCount || 'seluruh'} orang!`);
        router.push(backHref);
      }
    } catch {
      setErrorMessage('Terjadi gangguan jaringan saat menyimpan pengumuman.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData) return;
    setLoading(true);
    try {
      const res = await deleteAnnouncementAction(initialData.id);
      if (res.success) {
        success('Pengumuman berhasil dihapus.');
        router.push(backHref);
      } else {
        showToastError(res.error || 'Gagal menghapus pengumuman.');
        setLoading(false);
      }
    } catch {
      showToastError('Terjadi gangguan jaringan.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-[12px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-xs sm:text-sm flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Ada kesalahan pada isian formulir:</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Target Penerima */}
      <div className="space-y-3 p-4 rounded-[12px] bg-white border border-[var(--color-border)] shadow-xs">
        <label className="block text-xs sm:text-sm font-bold font-display text-[var(--color-text)]">
          Target Penerima Pengumuman
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {currentRole === 'admin' && (
            <button
              type="button"
              onClick={() => setTarget('all')}
              className={`p-3 rounded-[10px] border text-xs sm:text-sm font-semibold transition-colors min-h-[44px] text-left flex items-center gap-2 ${
                target === 'all'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-stone-400'
              }`}
            >
              <Megaphone className="w-4 h-4 shrink-0" />
              <span>Semua Warga</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setTarget('class')}
            className={`p-3 rounded-[10px] border text-xs sm:text-sm font-semibold transition-colors min-h-[44px] text-left flex items-center gap-2 ${
              target === 'class'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-stone-400'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Satu Kelas</span>
          </button>

          <button
            type="button"
            onClick={() => setTarget('parents')}
            className={`p-3 rounded-[10px] border text-xs sm:text-sm font-semibold transition-colors min-h-[44px] text-left flex items-center gap-2 ${
              target === 'parents'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-stone-400'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Orang Tua Saja</span>
          </button>
        </div>

        {target === 'class' && (
          <div className="pt-2 space-y-1">
            <label className="block text-xs font-semibold text-[var(--color-text)]">
              Pilih Kelas:
            </label>
            {classes.length > 0 ? (
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full p-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] min-h-[44px]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-rose-600 italic">
                Anda belum memiliki kelas yang terdaftar.
              </p>
            )}
          </div>
        )}

        {/* Khusus Admin: Sematkan di atas */}
        {currentRole === 'admin' && (
          <div className="pt-2 border-t border-[var(--color-border)]">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-semibold text-[var(--color-text)] select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <Pin className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Sematkan pengumuman ini di bagian paling atas</span>
            </label>
          </div>
        )}
      </div>

      {/* Judul Pengumuman */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <label className="block text-xs sm:text-sm font-bold font-display text-[var(--color-text)]">
            Judul Pengumuman
          </label>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {title.length}/100 karakter
          </span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 100))}
          placeholder="Contoh: Jadwal Penilaian Akhir Semester Ganjil 2026/2027"
          className="w-full p-3 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-white text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] min-h-[44px]"
          disabled={loading}
        />
      </div>

      {/* Isi Pengumuman */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <label className="block text-xs sm:text-sm font-bold font-display text-[var(--color-text)]">
            Isi Pengumuman
          </label>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {body.length}/2000 karakter
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 2000))}
          rows={6}
          placeholder="Tulis isi pengumuman secara rinci, sopan, dan jelas..."
          className="w-full p-3.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-white text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] leading-relaxed resize-none"
          disabled={loading}
        />
      </div>

      {/* Pratinjau Perkiraan Target */}
      <div className="p-3.5 rounded-[10px] bg-[#FAF7F2] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center gap-2.5">
        <Users className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
        <span>
          Pengumuman ini akan dikirimkan kepada: <strong>{targetSummary}</strong>.
        </span>
      </div>

      {/* Tombol Simpan & Hapus */}
      <div className="flex items-center justify-between pt-2 gap-3">
        <Button
          type="submit"
          variant="primary"
          className="min-h-[44px]"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span>{isEdit ? 'Simpan Perubahan' : 'Kirim Pengumuman'}</span>
            </span>
          )}
        </Button>

        {isEdit && (
          <Button
            type="button"
            variant="danger"
            className="min-h-[44px]"
            onClick={() => setShowDeleteModal(true)}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            <span>Hapus Pengumuman</span>
          </Button>
        )}
      </div>

      {/* Dialog Konfirmasi Hapus */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-[var(--color-border)] rounded-[16px] shadow-lg max-w-sm w-full p-5 space-y-4">
            <h3 className="font-bold font-display text-base text-[var(--color-text)]">
              Hapus Pengumuman?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
              Pengumuman ini akan dihapus dari sistem. Penerima tidak akan menerima notifikasi penghapusan. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

