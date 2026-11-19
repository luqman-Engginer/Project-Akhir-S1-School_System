'use client';

import { useState } from 'react';
import { Bell, Send, MessageCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { sendParentReminderAction } from '@/lib/actions/reminders';

interface ParentReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  assignmentTitle: string;
  subjectName: string;
}

export function ParentReminderDialog({
  isOpen,
  onClose,
  studentId,
  studentName,
  assignmentTitle,
  subjectName,
}: ParentReminderDialogProps) {
  const { success, error: showToastError } = useToast();
  const defaultMessage = `Halo ${studentName}, jangan lupa tugas "${assignmentTitle}" untuk mata pelajaran ${subjectName} ya.`;
  const [message, setMessage] = useState(defaultMessage);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendAppReminder = async () => {
    if (!message.trim()) return;
    setLoading(true);

    try {
      const res = await sendParentReminderAction(studentId, message);
      if (!res.success) {
        showToastError(res.error || 'Gagal mengirim pengingat.');
        setLoading(false);
        return;
      }

      success('Pengingat berhasil dikirimkan ke aplikasi ananda.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      showToastError('Terjadi gangguan jaringan saat mengirim pengingat.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] shadow-lg max-w-md w-full p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold font-display text-base text-[var(--color-text)]">
                Kirim Pengingat Tugas
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Untuk ananda: <strong>{studentName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--color-text)]">
            Teks Pengingat (Maks 200 karakter)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            rows={3}
            className="w-full p-3 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] leading-relaxed resize-none"
            placeholder="Tulis pesan pengingat..."
            disabled={loading}
          />
          <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]">
            <span>Tersisa {200 - message.length} karakter</span>
            <span>Maksimal 5 pengingat per hari</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
          <Button
            type="button"
            variant="primary"
            className="w-full sm:flex-1 min-h-[44px]"
            onClick={handleSendAppReminder}
            disabled={loading || !message.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span>Kirim di Aplikasi</span>
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto min-h-[44px]"
            onClick={handleOpenWhatsApp}
          >
            <MessageCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
            <span>Kirim via WA</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
