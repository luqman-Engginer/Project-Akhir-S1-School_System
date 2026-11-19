'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { updateLeaveRequestStatus } from '@/lib/actions/leaves';
import { formatWIB } from '@/lib/dates';

interface TeacherLeaveItemProps {
  leave: {
    leave_id: string;
    student_name: string;
    type: 'sick' | 'excused';
    date_from: string;
    date_to: string;
    reason: string;
    created_at: string;
  };
}

export function TeacherLeaveItem({ leave }: TeacherLeaveItemProps) {
  const { success, error } = useToast();
  const [activeDialog, setActiveDialog] = useState<'approved' | 'rejected' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  if (isResolved) {
    return null;
  }

  const handleConfirmAction = async () => {
    if (!activeDialog) return;
    setIsLoading(true);

    try {
      const res = await updateLeaveRequestStatus(leave.leave_id, activeDialog);
      if (res.success) {
        success(res.message || 'Status izin berhasil diperbarui');
        setIsResolved(true);
      } else {
        error(res.error || 'Gagal memperbarui status');
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Terjadi gangguan jaringan');
    } finally {
      setIsLoading(false);
      setActiveDialog(null);
    }
  };

  const isOneDay = leave.date_from === leave.date_to;
  const dateFormatted = isOneDay
    ? formatWIB(leave.date_from, { day: 'numeric', month: 'short' })
    : `${formatWIB(leave.date_from, { day: 'numeric', month: 'short' })} - ${formatWIB(leave.date_to, { day: 'numeric', month: 'short' })}`;

  const typeLabel = leave.type === 'sick' ? 'Izin Sakit' : 'Izin Keperluan';

  return (
    <>
      <div className="p-4 rounded-[12px] bg-white border border-[#E6E0D6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors hover:border-[#DDD7CD]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FAF0E6] text-[var(--color-accent)] flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm sm:text-base text-[var(--color-text)]">
                {leave.student_name}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F3EFEA] text-[var(--color-text-muted)] border border-[#E6E0D6]">
                {typeLabel}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] font-medium">
                ({dateFormatted})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1 italic">
              &ldquo;{leave.reason}&rdquo;
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            variant="quiet"
            size="sm"
            onClick={() => setActiveDialog('rejected')}
            className="text-[var(--status-danger-text)] hover:bg-[#FDF2F2]"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            <span>Tolak</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveDialog('approved')}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>Setujui</span>
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={activeDialog !== null}
        onClose={() => setActiveDialog(null)}
        onConfirm={handleConfirmAction}
        isLoading={isLoading}
        isDestructive={activeDialog === 'rejected'}
        title={
          activeDialog === 'approved'
            ? 'Setujui Permohonan Izin?'
            : 'Tolak Permohonan Izin?'
        }
        description={
          activeDialog === 'approved'
            ? `Anda akan menyetujui ${typeLabel.toLowerCase()} untuk ${leave.student_name} pada ${dateFormatted}. Notifikasi akan dikirimkan kepada orang tua/murid.`
            : `Apakah Anda yakin ingin menolak surat izin dari ${leave.student_name}? Tindakan ini akan mengembalikan status pengajuan menjadi ditolak.`
        }
        confirmLabel={activeDialog === 'approved' ? 'Ya, Setujui' : 'Ya, Tolak'}
        cancelLabel="Batal"
      />
    </>
  );
}
