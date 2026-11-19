'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Calendar,
  Save,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/FormControls';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import {
  createAssignmentAction,
  updateAssignmentAction,
  deleteAssignmentAction,
} from '@/lib/actions/assignments';
import { uploadAttachment } from '@/lib/storage';
import { todayWIB } from '@/lib/dates';

export interface TeachingOption {
  id: string; // teaching_id
  subjectName: string;
}

interface AssignmentFormProps {
  mode: 'create' | 'edit';
  classId: string;
  className: string;
  teachings: TeachingOption[];
  initialData?: {
    id: string;
    teachingId: string;
    title: string;
    description: string | null;
    deadline: string; // ISO string
    attachmentPath: string | null;
    submissionsCount: number;
  };
}

export function AssignmentForm({
  mode,
  classId,
  className: classTitle,
  teachings,
  initialData,
}: AssignmentFormProps) {
  const router = useRouter();
  const { success, error } = useToast();

  // Hitung default deadline besok jam 23:59 WIB
  const getDefaultDeadline = () => {
    if (initialData?.deadline) {
      // Potong ke format YYYY-MM-DDTHH:mm untuk input datetime-local
      const d = new Date(initialData.deadline);
      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      return localIso;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    return `${dateStr}T23:59`;
  };

  const [teachingId, setTeachingId] = useState(
    initialData?.teachingId || teachings[0]?.id || ''
  );
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [deadline, setDeadline] = useState(getDefaultDeadline());
  const [file, setFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Dialog konfirmasi edit bila sudah ada pengumpulan
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  // Dialog konfirmasi hapus
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const submissionsCount = initialData?.submissionsCount || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (title.trim().length < 3) {
      setLocalError('Judul tugas minimal 3 karakter.');
      return;
    }

    if (title.trim().length > 100) {
      setLocalError('Judul tugas maksimal 100 karakter.');
      return;
    }

    if (description.length > 2000) {
      setLocalError('Deskripsi tugas maksimal 2000 karakter.');
      return;
    }

    // Jika mode edit dan deadline diubah sementara sudah ada pengumpulan, minta konfirmasi
    if (
      mode === 'edit' &&
      submissionsCount > 0 &&
      new Date(deadline).toISOString() !== initialData?.deadline
    ) {
      setShowEditConfirm(true);
      return;
    }

    executeSave();
  };

  const executeSave = async () => {
    setIsLoading(true);
    setLocalError(null);

    try {
      let attachmentPath: string | null = initialData?.attachmentPath || null;

      // Upload file baru jika ada
      if (file) {
        const uploadRes = await uploadAttachment('assignment', classId, file);
        if (!uploadRes.success) {
          setLocalError(uploadRes.error || 'Gagal mengunggah berkas lampiran.');
          setIsLoading(false);
          return;
        }
        attachmentPath = uploadRes.path || null;
      }

      if (mode === 'create') {
        const res = await createAssignmentAction({
          teachingId,
          title: title.trim(),
          description: description.trim() || null,
          deadline: new Date(deadline).toISOString(),
          attachmentPath,
        });

        if (res.success) {
          success('Tugas dibuat. Murid dan orang tua sudah diberi tahu.');
          router.push(`/guru/kelas/${classId}?tab=tugas`);
          router.refresh();
        } else {
          setLocalError(res.error || 'Gagal membuat tugas.');
        }
      } else {
        const res = await updateAssignmentAction(initialData!.id, {
          title: title.trim(),
          description: description.trim() || null,
          deadline: new Date(deadline).toISOString(),
          attachmentPath,
        });

        if (res.success) {
          success('Perubahan tugas berhasil disimpan.');
          router.push(`/guru/kelas/${classId}/tugas/${initialData!.id}`);
          router.refresh();
        } else {
          setLocalError(res.error || 'Gagal memperbarui tugas.');
        }
      }
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : 'Terjadi gangguan jaringan'
      );
    } finally {
      setIsLoading(false);
      setShowEditConfirm(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    setIsLoading(true);

    try {
      const res = await deleteAssignmentAction(initialData.id);
      if (res.success) {
        success('Tugas berhasil dihapus.');
        router.push(`/guru/kelas/${classId}?tab=tugas`);
        router.refresh();
      } else {
        setLocalError(res.error || 'Gagal menghapus tugas.');
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Terjadi gangguan');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="p-5 sm:p-7 rounded-[16px] bg-white border border-[#E6E0D6] shadow-xs space-y-5 max-w-2xl"
      >
        {localError && (
          <div
            role="alert"
            className="p-3.5 rounded-[10px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-xs sm:text-sm flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{localError}</span>
          </div>
        )}

        {/* Pemilihan Mapel jika ada lebih dari 1 */}
        {teachings.length > 1 && mode === 'create' ? (
          <Select
            label="Mata Pelajaran"
            value={teachingId}
            onChange={(e) => setTeachingId(e.target.value)}
            options={teachings.map((t) => ({
              value: t.id,
              label: t.subjectName,
            }))}
          />
        ) : (
          <div className="p-3 rounded-[10px] bg-[#FAF7F2] border border-[#DDD7CD] text-xs">
            <span className="text-[var(--color-text-muted)] block">Kelas & Mapel:</span>
            <span className="font-bold text-sm text-[var(--color-primary)]">
              {classTitle} &bull; {teachings[0]?.subjectName || 'Mata Pelajaran'}
            </span>
          </div>
        )}

        {/* Judul Tugas (3-100 karakter) */}
        <Input
          label="Judul Tugas"
          placeholder="Contoh: Praktikum 3 - Membuat Form Login Responsive"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={100}
          hint="Minimal 3 karakter, maksimal 100 karakter"
        />

        {/* Batas Waktu Pengumpulan (Deadline) */}
        <div>
          <label
            htmlFor="assignment-deadline"
            className="block text-sm font-medium text-[var(--color-text)] mb-1"
          >
            Batas Waktu Pengumpulan (WIB){' '}
            <span className="text-[var(--color-accent)]">*</span>
          </label>
          <input
            id="assignment-deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[10px] bg-white border border-[#DDD7CD] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)] cursor-pointer"
            required
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Waktu standar WIB. Siswa yang mengumpulkan setelah batas ini akan ditandai Terlambat.
          </p>
        </div>

        {/* Deskripsi / Petunjuk Pengerjaan (Maks 2000) */}
        <div>
          <label
            htmlFor="assignment-desc"
            className="block text-sm font-medium text-[var(--color-text)] mb-1"
          >
            Petunjuk Pengerjaan / Instruksi (Opsional)
          </label>
          <textarea
            id="assignment-desc"
            rows={5}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tuliskan petunjuk pengerjaan tugas, kriteria penilaian, atau format pengumpulan yang diharapkan..."
            className="w-full p-3 text-sm rounded-[10px] border border-[#DDD7CD] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)] resize-none"
          />
          <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] mt-1">
            <span>Maksimal 2000 karakter</span>
            <span className={description.length > 1900 ? 'text-[var(--color-accent)] font-semibold' : ''}>
              {description.length} / 2000
            </span>
          </div>
        </div>

        {/* Lampiran Materi / Soal (Maks 5 MB) */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Berkas Lampiran Materi / Soal (Opsional)
          </label>
          <div className="p-3.5 border-2 border-dashed border-[#DDD7CD] rounded-[12px] bg-[#FAF7F2] text-center">
            <input
              type="file"
              id="assignment-file"
              accept=".pdf,image/png,image/jpeg,.docx"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) {
                  if (selected.size > 5 * 1024 * 1024) {
                    setLocalError('Ukuran file melebihi batas maksimal 5 MB.');
                    return;
                  }
                  setFile(selected);
                  setLocalError(null);
                }
              }}
              className="hidden"
            />
            <label
              htmlFor="assignment-file"
              className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
            >
              <Upload className="w-5 h-5 text-[var(--color-primary)]" />
              <span className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
                {file
                  ? file.name
                  : initialData?.attachmentPath
                  ? 'Ganti Berkas Lampiran'
                  : 'Pilih Dokumen Soal (PDF, DOCX, JPG, PNG)'}
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Ukuran berkas maksimal 5 MB
              </span>
            </label>
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="mt-2 text-[11px] text-[var(--status-danger-text)] hover:underline cursor-pointer"
              >
                Hapus file baru
              </button>
            )}
          </div>
        </div>

        {/* Tombol Simpan & Hapus */}
        <div className="pt-4 border-t border-[#F0EBE1] flex flex-col sm:flex-row items-center justify-between gap-3">
          {mode === 'edit' ? (
            submissionsCount === 0 ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                <span>Hapus Tugas</span>
              </Button>
            ) : (
              <span className="text-xs text-[var(--color-text-muted)] italic">
                Tugas tidak dapat dihapus ({submissionsCount} siswa sudah mengumpulkan).
              </span>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isLoading}
              disabled={title.trim().length < 3}
            >
              <Save className="w-4 h-4 mr-1.5" />
              <span>{mode === 'create' ? 'Buat Tugas' : 'Simpan Perubahan'}</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Dialog Konfirmasi Edit Deadline */}
      <ConfirmDialog
        isOpen={showEditConfirm}
        onClose={() => setShowEditConfirm(false)}
        onConfirm={executeSave}
        isLoading={isLoading}
        title="Ubah Batas Waktu Tugas?"
        description={`Sudah ada ${submissionsCount} murid yang mengumpulkan tugas ini. Apakah Anda yakin ingin mengubah batas waktu pengumpulan?`}
        confirmLabel="Lanjutkan Perubahan"
        cancelLabel="Batal"
      />

      {/* Dialog Konfirmasi Hapus Tugas */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        isLoading={isLoading}
        isDestructive
        title="Hapus Tugas Ini?"
        description={`Apakah Anda yakin ingin menghapus tugas "${title}"? Tugas yang dihapus tidak dapat dipulihkan.`}
        confirmLabel="Ya, Hapus Tugas"
        cancelLabel="Batal"
      />
    </>
  );
}
