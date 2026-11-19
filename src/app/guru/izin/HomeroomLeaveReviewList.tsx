'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { reviewLeaveRequestAction } from '@/lib/actions/leaves';
import { formatWIB, formatRelativeTime } from '@/lib/dates';
import { getAttachmentSignedUrl } from '@/lib/storage';

export interface HomeroomLeaveItem {
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

interface HomeroomLeaveReviewListProps {
  pendingLeaves: HomeroomLeaveItem[];
  historyLeaves: HomeroomLeaveItem[];
}

export function HomeroomLeaveReviewList({
  pendingLeaves: initialPending,
  historyLeaves: initialHistory,
}: HomeroomLeaveReviewListProps) {
  const { success, error } = useToast();

  const [pendingList, setPendingList] = useState<HomeroomLeaveItem[]>(initialPending);
  const [historyList, setHistoryList] = useState<HomeroomLeaveItem[]>(initialHistory);

  const [selectedLeave, setSelectedLeave] = useState<HomeroomLeaveItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null);

  const handleOpenAttachment = async (path: string) => {
    setOpeningAttachment(path);
    try {
      const res = await getAttachmentSignedUrl(path, 300); // 5 menit
      if (res.signedUrl) {
        window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        error(res.error || 'Gagal memuat berkas lampiran');
      }
    } catch {
      error('Gagal membuka lampiran');
    } finally {
      setOpeningAttachment(null);
    }
  };

  const handleConfirmReview = async () => {
    if (!selectedLeave || !reviewAction) return;

    setIsLoading(true);
    try {
      const res = await reviewLeaveRequestAction(
        selectedLeave.id,
        reviewAction,
        reviewAction === 'rejected' ? rejectNote : null
      );

      if (res.success) {
        success(res.message || 'Status izin diperbarui');

        // Pindahkan dari pending ke history
        const updatedItem: HomeroomLeaveItem = {
          ...selectedLeave,
          status: reviewAction,
          review_note: reviewAction === 'rejected' ? rejectNote : null,
        };

        setPendingList((prev) => prev.filter((p) => p.id !== selectedLeave.id));
        setHistoryList((prev) => [updatedItem, ...prev]);

        setSelectedLeave(null);
        setReviewAction(null);
        setRejectNote('');
      } else {
        error(res.error || 'Gagal memproses permohonan izin');
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

  return (
    <div className="space-y-8">
      {/* 1. DAFTAR PERMOHONAN MENUNGGU PERSETUJUAN */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display text-[var(--color-text)]">
            Menunggu Persetujuan ({pendingList.length})
          </h2>
        </div>

        {pendingList.length > 0 ? (
          <div className="space-y-3">
            {pendingList.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-[14px] bg-white border border-[#E6E0D6] shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-base text-[var(--color-text)]">
                      {item.student_name}
                    </span>
                    <StatusBadge
                      status={item.type === 'sick' ? 'sakit' : 'izin'}
                      size="sm"
                    />
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
                </div>

                <div className="pt-2 border-t border-[#F0EBE1] flex flex-wrap items-center justify-between gap-3">
                  {/* Lampiran berkas */}
                  {item.attachment_path ? (
                    <button
                      type="button"
                      disabled={openingAttachment === item.attachment_path}
                      onClick={() => handleOpenAttachment(item.attachment_path!)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer disabled:opacity-60"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>
                        {openingAttachment === item.attachment_path
                          ? 'Membuka berkas...'
                          : 'Buka Surat Dokter / Lampiran'}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)] italic">
                      Tidak ada lampiran berkas
                    </span>
                  )}

                  {/* Tombol Aksi */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => {
                        setSelectedLeave(item);
                        setReviewAction('rejected');
                        setRejectNote('');
                      }}
                      className="text-[var(--status-danger-text)] hover:bg-[#FDF2F2]"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      <span>Tolak</span>
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedLeave(item);
                        setReviewAction('approved');
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      <span>Setujui</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-[12px] bg-[#FAF7F2] border border-dashed border-[#DDD7CD] text-center text-sm text-[var(--color-text-muted)]">
            Tidak ada permohonan surat izin yang menunggu persetujuan saat ini.
          </div>
        )}
      </section>

      {/* 2. RIWAYAT PERMOHONAN TERDAHULU */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold font-display text-[var(--color-text)]">
          Riwayat Pengajuan Terdahulu
        </h2>

        {historyList.length > 0 ? (
          <div className="space-y-2.5">
            {historyList.map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 rounded-[12px] bg-white border border-[#E6E0D6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--color-text)]">
                      {item.student_name}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      &bull; {formatDateRange(item.date_from, item.date_to)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-1">
                    Alasan: {item.reason}
                  </p>
                  {item.review_note && (
                    <p className="text-[11px] text-[var(--status-danger-text)] mt-0.5">
                      Catatan penolakan: &ldquo;{item.review_note}&rdquo;
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <StatusBadge
                    status={item.status as StatusVariant}
                    size="sm"
                  />
                  {item.attachment_path && (
                    <button
                      type="button"
                      onClick={() => handleOpenAttachment(item.attachment_path!)}
                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer"
                      title="Lihat lampiran"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-[12px] bg-white border border-[#E6E0D6] text-center text-xs text-[var(--color-text-muted)]">
            Belum ada riwayat permohonan izin terdahulu.
          </div>
        )}
      </section>

      {/* Modal Dialog Konfirmasi */}
      {selectedLeave && reviewAction && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => {
            setSelectedLeave(null);
            setReviewAction(null);
            setRejectNote('');
          }}
          onConfirm={handleConfirmReview}
          isLoading={isLoading}
          isDestructive={reviewAction === 'rejected'}
          title={
            reviewAction === 'approved'
              ? 'Setujui Permohonan Izin?'
              : 'Tolak Permohonan Izin?'
          }
          description={
            reviewAction === 'approved'
              ? `Anda akan menyetujui izin untuk ${selectedLeave.student_name} pada tanggal ${formatDateRange(selectedLeave.date_from, selectedLeave.date_to)}. Sistem akan otomatis menandai absensi siswa dan memberitahu orang tua/murid.`
              : `Apakah Anda yakin ingin menolak permohonan izin dari ${selectedLeave.student_name}? Anda dapat menyertakan alasan penolakan di bawah.`
          }
          confirmLabel={reviewAction === 'approved' ? 'Ya, Setujui' : 'Ya, Tolak'}
          cancelLabel="Batal"
        />
      )}
    </div>
  );
}
