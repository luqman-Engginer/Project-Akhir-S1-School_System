'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  Calendar,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/FormControls';
import { useToast } from '@/components/ui/Toast';
import { createLeaveRequestAction } from '@/lib/actions/leaves';
import { uploadAttachment } from '@/lib/storage';
import { buildWaLink } from '@/lib/whatsapp';
import { todayWIB, formatWIB } from '@/lib/dates';

export interface LeaveStudentOption {
  id: string;
  name: string;
  className?: string;
}

interface LeaveRequestFormProps {
  students: LeaveStudentOption[];
  defaultStudentId: string;
  historyUrl: string;
  homeroomPhone?: string | null;
  homeroomName?: string | null;
}

export function LeaveRequestForm({
  students,
  defaultStudentId,
  historyUrl,
  homeroomPhone,
  homeroomName,
}: LeaveRequestFormProps) {
  const { success, error } = useToast();

  const today = todayWIB();
  const minDateObj = new Date();
  minDateObj.setDate(minDateObj.getDate() - 3);
  const minDate = todayWIB(minDateObj);

  const [studentId, setStudentId] = useState(defaultStudentId);
  const [type, setType] = useState<'sick' | 'excused'>('sick');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const selectedStudent = students.find((s) => s.id === studentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validasi dasar di client
    if (!reason.trim() || reason.trim().length < 10) {
      setLocalError('Alasan izin wajib diisi minimal 10 karakter.');
      return;
    }

    if (reason.trim().length > 300) {
      setLocalError('Alasan izin maksimal 300 karakter.');
      return;
    }

    if (dateTo < dateFrom) {
      setLocalError('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      return;
    }

    setIsLoading(true);

    try {
      let attachmentPath: string | null = null;

      // Unggah berkas lampiran jika disertakan
      if (file) {
        const uploadRes = await uploadAttachment('leave', studentId, file);
        if (!uploadRes.success) {
          setLocalError(uploadRes.error || 'Gagal mengunggah berkas lampiran');
          setIsLoading(false);
          return;
        }
        attachmentPath = uploadRes.path || null;
      }

      // Kirim permohonan ke server action
      const res = await createLeaveRequestAction({
        studentId,
        type,
        dateFrom,
        dateTo,
        reason: reason.trim(),
        attachmentPath,
      });

      if (res.success) {
        success('Permohonan izin berhasil dikirimkan ke wali kelas.');
        setSubmittedSuccess(true);
      } else {
        setLocalError(res.error || 'Gagal mengajukan izin');
      }
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : 'Terjadi gangguan jaringan'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Tampilan Sukses Konfirmasi
  if (submittedSuccess) {
    const formattedFrom = formatWIB(dateFrom, { day: 'numeric', month: 'short' });
    const formattedTo = formatWIB(dateTo, { day: 'numeric', month: 'short', year: 'numeric' });
    const dateText = dateFrom === dateTo ? formattedTo : `${formattedFrom} - ${formattedTo}`;
    const typeLabel = type === 'sick' ? 'Izin Sakit' : 'Izin Keperluan';

    const waText = `Halo ${homeroomName ? `Bapak/Ibu ${homeroomName}` : 'Bapak/Ibu Wali Kelas'}, menginfokan bahwa surat ${typeLabel.toLowerCase()} untuk ${selectedStudent?.name || 'siswa'} pada tanggal ${dateText} telah diajukan melalui aplikasi Sekolahku. Mohon berkenan untuk ditinjau. Terima kasih.`;
    const waUrl = buildWaLink(homeroomPhone, waText);

    return (
      <div className="p-6 sm:p-8 rounded-[16px] bg-white border border-[#E6E0D6] shadow-sm text-center max-w-lg mx-auto space-y-4 animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success-text)] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold font-display text-[var(--color-text)]">
            Izin Terkirim ke Wali Kelas
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
            Permohonan <strong>{typeLabel}</strong> untuk{' '}
            <strong>{selectedStudent?.name}</strong> ({dateText}) telah berhasil diajukan dan sedang menunggu persetujuan wali kelas.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-2.5">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#25D366] text-white font-semibold text-sm hover:bg-[#1EBE5B] transition-colors min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kabari Wali Kelas via WhatsApp</span>
            </a>
          )}

          <Button href={historyUrl} variant="primary" size="md">
            <span>Lihat Riwayat Izin</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 sm:p-7 rounded-[16px] bg-white border border-[#E6E0D6] shadow-xs space-y-5 max-w-xl"
    >
      {localError && (
        <div
          role="alert"
          className="p-3.5 rounded-[10px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-xs sm:text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{localError}</span>
        </div>
      )}

      {/* Pilihan Siswa jika lebih dari 1 */}
      {students.length > 1 ? (
        <Select
          label="Pilih Siswa"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          options={students.map((s) => ({
            value: s.id,
            label: `${s.name} ${s.className ? `(${s.className})` : ''}`,
          }))}
        />
      ) : selectedStudent ? (
        <div className="p-3 rounded-[10px] bg-[#FAF7F2] border border-[#DDD7CD] text-xs">
          <span className="text-[var(--color-text-muted)] block">Mengajukan Izin Untuk:</span>
          <span className="font-bold text-sm text-[var(--color-primary)]">
            {selectedStudent.name}
          </span>
          {selectedStudent.className && (
            <span className="text-[var(--color-text-muted)] ml-1">
              ({selectedStudent.className})
            </span>
          )}
        </div>
      ) : null}

      {/* Jenis Izin (Sakit / Keperluan) */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Jenis Izin <span className="text-[var(--color-accent)]">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3" role="radiogroup">
          <button
            type="button"
            role="radio"
            aria-checked={type === 'sick'}
            onClick={() => setType('sick')}
            className={`
              p-3.5 rounded-[12px] border text-left cursor-pointer transition-all min-h-[44px] flex items-center justify-between
              ${
                type === 'sick'
                  ? 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)] text-[var(--status-warning-text)] shadow-2xs'
                  : 'bg-white border-[#E6E0D6] text-[var(--color-text-muted)] hover:bg-[#FAF7F2]'
              }
            `}
          >
            <div>
              <span className="font-bold text-sm block">Sakit</span>
              <span className="text-[11px] opacity-80">Tidak enak badan / dokter</span>
            </div>
            {type === 'sick' && <CheckCircle2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={type === 'excused'}
            onClick={() => setType('excused')}
            className={`
              p-3.5 rounded-[12px] border text-left cursor-pointer transition-all min-h-[44px] flex items-center justify-between
              ${
                type === 'excused'
                  ? 'bg-[var(--status-info-bg)] border-[var(--status-info-border)] text-[var(--status-info-text)] shadow-2xs'
                  : 'bg-white border-[#E6E0D6] text-[var(--color-text-muted)] hover:bg-[#FAF7F2]'
              }
            `}
          >
            <div>
              <span className="font-bold text-sm block">Izin Keperluan</span>
              <span className="text-[11px] opacity-80">Urusan keluarga / dinas</span>
            </div>
            {type === 'excused' && <CheckCircle2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Rentang Tanggal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="date-from"
            className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1"
          >
            Mulai Tanggal <span className="text-[var(--color-accent)]">*</span>
          </label>
          <input
            id="date-from"
            type="date"
            min={minDate}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              if (e.target.value > dateTo) setDateTo(e.target.value);
            }}
            className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[10px] bg-white border border-[#DDD7CD] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)] cursor-pointer"
            required
          />
        </div>

        <div>
          <label
            htmlFor="date-to"
            className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1"
          >
            Sampai Tanggal <span className="text-[var(--color-accent)]">*</span>
          </label>
          <input
            id="date-to"
            type="date"
            min={dateFrom}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-[10px] bg-white border border-[#DDD7CD] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)] cursor-pointer"
            required
          />
        </div>
      </div>

      {/* Alasan Izin (10-300 karakter) */}
      <div>
        <label
          htmlFor="leave-reason"
          className="block text-sm font-medium text-[var(--color-text)] mb-1"
        >
          Alasan Lengkap <span className="text-[var(--color-accent)]">*</span>
        </label>
        <textarea
          id="leave-reason"
          rows={3}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tuliskan keterangan sakit atau urusan keluarga secara jelas..."
          className="w-full p-3 text-sm rounded-[10px] border border-[#DDD7CD] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)] resize-none"
          required
        />
        <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] mt-1">
          <span>Minimal 10 karakter</span>
          <span className={reason.length > 280 ? 'text-[var(--color-accent)] font-semibold' : ''}>
            {reason.length} / 300 karakter
          </span>
        </div>
      </div>

      {/* Unggah Berkas Lampiran (Opsional) */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Lampiran Bukti (Opsional)
        </label>
        <div className="p-3.5 border-2 border-dashed border-[#DDD7CD] rounded-[12px] bg-[#FAF7F2] text-center">
          <input
            type="file"
            id="file-attachment"
            accept=".pdf,image/png,image/jpeg"
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
            htmlFor="file-attachment"
            className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
          >
            <Upload className="w-5 h-5 text-[var(--color-primary)]" />
            <span className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              {file ? file.name : 'Pilih Surat Dokter / Dokumen (PDF, JPG, PNG)'}
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Maksimal 5 MB
            </span>
          </label>
          {file && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="mt-2 text-[11px] text-[var(--status-danger-text)] hover:underline cursor-pointer"
            >
              Hapus file terpilih
            </button>
          )}
        </div>
      </div>

      {/* Tombol Aksi */}
      <div className="pt-2 flex items-center justify-end gap-3">
        <Button href={historyUrl} variant="secondary" size="md">
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isLoading}
          disabled={reason.trim().length < 10}
        >
          <Send className="w-4 h-4 mr-1.5" />
          <span>Kirimkan Permohonan</span>
        </Button>
      </div>
    </form>
  );
}
