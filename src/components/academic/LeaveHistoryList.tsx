'use client';

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { cancelLeaveRequestAction } from '@/lib/actions/leaves';
import { getAttachmentSignedUrl } from '@/lib/storage';
import { formatWIB, formatRelativeTime } from '@/lib/dates';

export interface LeaveHistoryItem {
  id: string;
  student_name: string;
  type: 'sick' | 'excused';
  date_from: string;
  date_to: string;
  reason: string;
  attachment_path: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  created_at: string;
}

interface LeaveHistoryListProps {
  initialLeaves: LeaveHistoryItem[];
  createUrl: string;
}

export function LeaveHistoryList({
  initialLeaves,
  createUrl,
}: LeaveHistoryListProps) {
  const { success, error } = useToast();

  const [leaves, setLeaves] = useState<LeaveHistoryItem[]>(initialLeaves);
  const [selectedToCancel, setSelectedToCancel] = useState<LeaveHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openingFile, setOpeningFile] = useState<string | null>(null);

  const handleOpenFile = async (path: string) => {
    setOpeningFile(path);
    try {
      const res = await getAttachmentSignedUrl(path, 300);
      if (res.signedUrl) {
        window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        error(res.error || 'Gagal membuka berkas');
      }
    } catch {
      error('Gagal memuat berkas');
    } finally {
      setOpeningFile(null);
    }
  };

  const handleCancelLeave = async () => {
    if (!selectedToCancel) return;

    setIsLoading(true);
    try {
      const res = await cancelLeaveRequestAction(selectedToCancel.id);
      if (res.success) {
        success('Permohonan izin berhasil dibatalkan.');
        setLeaves((prev) => prev.filter((item) => item.id !== selectedToCancel.id));
        setSelectedToCancel(null);
      } else {
        error(res.error || 'Gagal membatalkan permohonan izin');
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Terjadi gangguan jaringan');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateRange = (from: string, to: string) => {
    if (from === to) {
      return formatWIB(from, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return `${formatWIB(from, { day: 'numeric', month: 'short' })} - ${formatWIB(to, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  if (leaves.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Belum Ada Riwayat Izin"
        description="Anda belum pernah mengajukan surat izin sakit atau keperluan untuk masa sekolah berjalan."
        actionLabel="Ajukan Izin Sekarang"
        actionHref={createUrl}
      />
    );
  }

  return (
    <div className="space-y-3">
      {leaves.map((item) => {
        const isPending = item.status === 'pending';

        return (
          <div
            key={item.id}
            className="p-4 sm:p-5 rounded-[14px] bg-white border border-[#E6E0D6] shadow-2xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-[var(--color-text)]">
                  {item.student_name}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[var(--color-text)] border border-[#DDD7CD]">
                  {item.type === 'sick' ? 'Sakit' : 'Izin Keperluan'}
                </span>
                <StatusBadge status={item.status as StatusVariant} size="sm" />
              </div>

              <span className="text-xs text-[var(--color-text-muted)]">
                Diajukan {formatRelativeTime(item.created_at)}
              </span>
            </div>

            <div className="text-xs sm:text-sm text-[var(--color-text)] space-y-1">
              <div>
                <span className="text-[var(--color-text-muted)]">Tanggal: </span>
                <strong className="font-semibold">
                  {formatDateRange(item.date_from, item.date_to)}
                </strong>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">Alasan: </span>
                <span className="italic">&ldquo;{item.reason}&rdquo;</span>
              </div>
              {item.review_note && (
                <div className="text-[var(--status-danger-text)] text-xs mt-1">
                  Catatan wali kelas: &ldquo;{item.review_note}&rdquo;
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#F0EBE1] flex items-center justify-between gap-3 flex-wrap">
              {item.attachment_path ? (
                <button
                  type="button"
                  disabled={openingFile === item.attachment_path}
                  onClick={() => handleOpenFile(item.attachment_path!)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer disabled:opacity-60"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {openingFile === item.attachment_path
                      ? 'Membuka...'
                      : 'Lihat Lampiran Surat'}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)] italic">
                  Tanpa berkas lampiran
                </span>
              )}

              {/* Tombol Batalkan Izin hanya untuk pending */}
              {isPending && (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => setSelectedToCancel(item)}
                  className="text-[var(--status-danger-text)] hover:bg-[#FDF2F2]"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Batalkan Izin</span>
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal Dialog Batalkan */}
      {selectedToCancel && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setSelectedToCancel(null)}
          onConfirm={handleCancelLeave}
          isLoading={isLoading}
          isDestructive
          title="Batalkan Pengajuan Izin?"
          description={`Apakah Anda yakin ingin membatalkan surat izin untuk ${selectedToCancel.student_name} pada tanggal ${formatDateRange(selectedToCancel.date_from, selectedToCancel.date_to)}? Pengajuan yang dibatalkan akan dihapus permanen.`}
          confirmLabel="Ya, Batalkan Izin"
          cancelLabel="Kembali"
        />
      )}
    </div>
  );
}
