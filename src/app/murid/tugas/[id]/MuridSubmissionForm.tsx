'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Link as LinkIcon, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { uploadAttachment } from '@/lib/storage';
import { submitAssignmentAction } from '@/lib/actions/assignments';
import { isValidHttpUrl } from '@/lib/urls';

interface MuridSubmissionFormProps {
  assignmentId: string;
  isGraded: boolean;
  isOverdue: boolean;
  existingLink: string | null;
  existingAttachmentPath: string | null;
  existingAttachmentUrl: string | null;
}

export function MuridSubmissionForm({
  assignmentId,
  isGraded,
  isOverdue,
  existingLink,
  existingAttachmentPath,
  existingAttachmentUrl,
}: MuridSubmissionFormProps) {
  const router = useRouter();
  const { success, error: showToastError } = useToast();
  const [contentLink, setContentLink] = useState(existingLink || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(existingAttachmentPath);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(existingAttachmentUrl);

  const [loading, setLoading] = useState(false);

  const isSubmittedBefore = Boolean(existingLink || existingAttachmentPath);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGraded) return;

    const trimmedLink = contentLink.trim();

    if (!trimmedLink && !selectedFile && !attachmentPath) {
      showToastError('Harap masukkan tautan (link) atau unggah berkas tugas.');
      return;
    }

    if (trimmedLink && !isValidHttpUrl(trimmedLink)) {
      showToastError('Tautan harus diawali dengan http:// atau https://');
      return;
    }

    setLoading(true);

    try {
      let finalPath = attachmentPath;

      // Unggah file jika ada file baru dipilih
      if (selectedFile) {
        const uploadRes = await uploadAttachment('submission', assignmentId, selectedFile);
        if (!uploadRes.success || !uploadRes.path) {
          showToastError(uploadRes.error || 'Gagal mengunggah berkas.');
          setLoading(false);
          return;
        }
        finalPath = uploadRes.path;
      }

      const res = await submitAssignmentAction(assignmentId, {
        contentLink: trimmedLink || null,
        attachmentPath: finalPath,
      });

      if (!res.success) {
        showToastError(res.error || 'Gagal menyimpan pengumpulan tugas.');
        setLoading(false);
        return;
      }

      success(
        isSubmittedBefore
          ? 'Pengumpulan tugas berhasil diperbarui!'
          : 'Tugas berhasil dikumpulkan!'
      );
      router.refresh();
    } catch {
      showToastError('Terjadi gangguan jaringan saat mengumpulkan tugas.');
    } finally {
      setLoading(false);
    }
  };

  if (isGraded) {
    return (
      <div className="p-4 rounded-[12px] bg-stone-50 border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-muted)] flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
        <div>
          <p className="font-semibold text-[var(--color-text)]">Pengumpulan Telah Dinilai</p>
          <p>Tugas Anda telah dinilai oleh bapak/ibu guru sehingga pengumpulan tidak dapat diubah lagi.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isOverdue && (
        <div className="p-3.5 rounded-[10px] bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Batas Waktu Pengumpulan Telah Lewat</p>
            <p className="text-amber-800">
              Anda tetap dapat mengumpulkan atau memperbarui tugas ini, namun status pengumpulan akan tercatat sebagai <strong>Terlambat</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Input Link Tugas */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-semibold text-[var(--color-text)]">
          Tautan Tugas (Opsional jika mengunggah berkas)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <LinkIcon className="w-4 h-4" />
          </div>
          <input
            type="url"
            value={contentLink}
            onChange={(e) => setContentLink(e.target.value)}
            placeholder="https://drive.google.com/... atau https://github.com/..."
            className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] min-h-[44px]"
            disabled={loading}
          />
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Pastikan hak akses tautan publik/dapat dibuka oleh bapak/ibu guru.
        </p>
      </div>

      {/* Input Berkas File */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-semibold text-[var(--color-text)]">
          Unggah Berkas File (Opsional jika mengisi tautan)
        </label>

        {attachmentUrl && !selectedFile && (
          <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#F7F4EE] border border-[var(--color-border)] text-xs mb-2">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <span className="truncate font-medium text-[var(--color-text)]">Berkas yang sudah diunggah</span>
            </div>
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline shrink-0 ml-2"
            >
              Lihat Berkas
            </a>
          </div>
        )}

        <div className="relative border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-[12px] p-4 sm:p-5 text-center transition-colors bg-[var(--color-surface)]">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setSelectedFile(e.target.files[0]);
              }
            }}
            disabled={loading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-8 h-8 text-[var(--color-text-muted)] mb-1.5" />
            <p className="text-xs sm:text-sm font-semibold text-[var(--color-text)]">
              {selectedFile ? selectedFile.name : 'Pilih atau Seret Berkas ke Sini'}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Format yang didukung: PDF, DOCX, PNG, JPG (Maksimal 5 MB)
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          className="w-full sm:w-auto min-h-[44px]"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan Pengumpulan...</span>
            </span>
          ) : isSubmittedBefore ? (
            <span>Perbarui Pengumpulan Tugas</span>
          ) : (
            <span>Kumpulkan Tugas Sekarang</span>
          )}
        </Button>
      </div>
    </form>
  );
}
