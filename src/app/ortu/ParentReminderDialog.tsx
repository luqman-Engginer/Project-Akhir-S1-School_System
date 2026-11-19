'use client';

import React, { useState } from 'react';
import { Send, Heart, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { sendParentReminderAction } from '@/lib/actions/reminders';

interface ParentReminderDialogProps {
  studentId: string;
  studentName: string;
}

export function ParentReminderDialog({
  studentId,
  studentName,
}: ParentReminderDialogProps) {
  const { success, error } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const maxChars = 200;
  const remainingChars = maxChars - message.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setLocalError('Silakan tulis pesan pengingat terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setLocalError(null);

    try {
      const res = await sendParentReminderAction(studentId, message);
      if (res.success) {
        success(res.message || 'Pengingat berhasil terkirim!');
        setMessage('');
        setIsOpen(false);
      } else {
        setLocalError(res.error || 'Gagal mengirim pengingat');
      }
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : 'Terjadi gangguan jaringan'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setLocalError(null);
          setIsOpen(true);
        }}
        className="w-full sm:w-auto"
      >
        <Heart className="w-4 h-4 mr-1.5 text-[var(--color-accent)]" />
        <span>Kirim Pengingat ke {studentName}</span>
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminder-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] shadow-xl p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FAF0E6] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3
                  id="reminder-title"
                  className="text-lg font-bold font-display text-[var(--color-text)]"
                >
                  Kirim Pengingat ke {studentName}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Tulis pesan motivasi atau pengingat tugas hari ini (maks. 5 kali per hari).
                </p>
              </div>
            </div>

            {localError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-[10px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{localError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  maxLength={maxChars}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder={`Contoh: Semangat belajarnya hari ini ya ${studentName}, jangan lupa tugasnya dikumpulkan tepat waktu.`}
                  className="w-full p-3 text-sm rounded-[10px] border border-[#DDD7CD] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)] resize-none"
                  autoFocus
                />
                <div className="flex justify-between items-center mt-1 text-xs text-[var(--color-text-muted)]">
                  <span>Maksimal 200 karakter</span>
                  <span className={remainingChars < 20 ? 'text-[var(--color-accent)] font-semibold' : ''}>
                    {remainingChars} tersisa
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isLoading}
                  disabled={!message.trim()}
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  <span>Kirim Pengingat</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
