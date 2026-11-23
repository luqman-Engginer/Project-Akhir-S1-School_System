'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  UploadCloud,
  FileText,
  Download,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  RotateCcw,
  Loader2,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import {
  sendMessageAction,
  updateThreadStatusAction,
  markThreadReadAction,
} from '@/lib/actions/chat';
import { uploadAttachment, getSignedUrl } from '@/lib/storage';
import {
  formatChatDateSeparator,
  formatChatMessageTime,
  parseMessageText,
  isQuietHoursWIB,
} from '@/lib/chat';
import { buildWaLink } from '@/lib/whatsapp';
import type { UserRole } from '@/types/database';

export interface ChatMessageItem {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  body: string;
  attachment_path: string | null;
  attachment_url?: string | null;
  created_at: string;
  status?: 'sending' | 'sent' | 'failed';
}

interface ThreadViewProps {
  currentProfileId: string;
  currentRole: 'teacher' | 'student' | 'parent';
  thread: {
    id: string;
    subject: string;
    category: 'leave' | 'consultation' | 'assignment' | 'other';
    status: 'new' | 'read' | 'replied' | 'done';
    student_id: string | null;
    student_name: string | null;
  };
  otherParty: {
    id: string;
    name: string;
    role: UserRole;
    phone?: string | null;
  };
  initialMessages: ChatMessageItem[];
  backHref: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  leave: 'Izin & Sakit',
  consultation: 'Konsultasi Belajar',
  assignment: 'Tugas & Nilai',
  other: 'Lainnya',
};

export function ThreadView({
  currentProfileId,
  currentRole,
  thread,
  otherParty,
  initialMessages,
  backHref,
}: ThreadViewProps) {
  const router = useRouter();
  const { success, error: showToastError } = useToast();

  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [threadStatus, setThreadStatus] = useState(thread.status);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // Pagination (Lihat pesan sebelumnya)
  const [displayedCount, setDisplayedCount] = useState(30);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const markReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const quietHours = isQuietHoursWIB();
  const draftKey = `sekolahku_chat_draft_${thread.id}`;

  // 1. Pulihkan draft dari sessionStorage saat mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) setInputText(saved);
    } catch {
      // Ignore
    }
  }, [draftKey]);

  // Simpan draft saat teks berubah
  const handleInputChange = (val: string) => {
    setInputText(val);
    try {
      sessionStorage.setItem(draftKey, val);
    } catch {
      // Ignore
    }
  };

  // 2. Debounced mark_thread_read
  const triggerMarkRead = useCallback(() => {
    if (markReadTimeoutRef.current) clearTimeout(markReadTimeoutRef.current);
    markReadTimeoutRef.current = setTimeout(() => {
      markThreadReadAction(thread.id);
    }, 600);
  }, [thread.id]);

  useEffect(() => {
    triggerMarkRead();
  }, [triggerMarkRead]);

  // 3. Scroll helper
  const isNearBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setHasNewMessagesBelow(false);
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  const handleScroll = () => {
    if (isNearBottom()) {
      setHasNewMessagesBelow(false);
    }
  };

  // 4. Supabase Realtime Subscription
  useEffect(() => {
    const supabase = createClient();
    const uniqueChannelName = `thread:${thread.id}:${Math.random().toString(36).substring(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `thread_id=eq.${thread.id}`,
          },
          async (payload: any) => {
            const newMsg = payload.new;
            if (!newMsg) return;

            // Dapatkan signed URL jika ada lampiran
            let attachmentUrl: string | null = null;
            if (newMsg.attachment_path) {
              attachmentUrl = await getSignedUrl(newMsg.attachment_path, 300);
            }

            setMessages((prev) => {
              // Hindari duplikasi jika pesan sudah ada via optimistic update
              const exists = prev.some((m) => m.id === newMsg.id);
              if (exists) return prev;

              const isMine = newMsg.sender_id === currentProfileId;
              const item: ChatMessageItem = {
                id: newMsg.id,
                sender_id: newMsg.sender_id,
                sender_name: isMine ? 'Anda' : otherParty.name,
                sender_role: isMine ? currentRole : otherParty.role,
                body: newMsg.body,
                attachment_path: newMsg.attachment_path,
                attachment_url: attachmentUrl,
                created_at: newMsg.created_at,
                status: 'sent',
              };

              return [...prev, item];
            });

            // Jika pesan dari orang lain, trigger mark read
            if (newMsg.sender_id !== currentProfileId) {
              triggerMarkRead();
            }

            // Auto-scroll jika user berada di bawah
            if (isNearBottom()) {
              setTimeout(() => scrollToBottom('smooth'), 100);
            } else {
              setHasNewMessagesBelow(true);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime chat subscription error (fallback to polling):', err);
    }

    // Fallback polling 30 detik
    const pollInterval = setInterval(() => {
      triggerMarkRead();
    }, 30000);

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      clearInterval(pollInterval);
      if (markReadTimeoutRef.current) clearTimeout(markReadTimeoutRef.current);
    };
  }, [thread.id, currentProfileId, otherParty.name, otherParty.role, currentRole, triggerMarkRead]);

  // 5. Kirim Pesan (Optimistic UI)
  const handleSendMessage = async (retryMsg?: ChatMessageItem) => {
    const textToSend = retryMsg ? retryMsg.body : inputText.trim();
    if (!textToSend && !selectedFile && !retryMsg) return;

    const tempId = retryMsg ? retryMsg.id : `temp-${Date.now()}`;

    if (!retryMsg) {
      // Buat gelembung optimis
      const optimisticItem: ChatMessageItem = {
        id: tempId,
        sender_id: currentProfileId,
        sender_name: 'Anda',
        sender_role: currentRole,
        body: textToSend,
        attachment_path: null,
        created_at: new Date().toISOString(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, optimisticItem]);
      setInputText('');
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        // Ignore
      }
      setTimeout(() => scrollToBottom('smooth'), 50);
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'sending' } : m))
      );
    }

    setIsSending(true);

    try {
      let attachmentPath: string | null = null;
      if (selectedFile) {
        const uploadRes = await uploadAttachment('message', thread.id, selectedFile);
        if (uploadRes.success && uploadRes.path) {
          attachmentPath = uploadRes.path;
        }
        setSelectedFile(null);
      }

      const res = await sendMessageAction(thread.id, {
        body: textToSend,
        attachmentPath,
      });

      if (!res.success || !res.messageId) {
        // Tandai gagal
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: 'failed' } : m
          )
        );
        showToastError(res.error || 'Gagal mengirim pesan.');
      } else {
        // Sukses
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, id: res.messageId!, status: 'sent' } : m
          )
        );
        if (threadStatus === 'done') {
          setThreadStatus('new');
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: 'failed' } : m
        )
      );
      showToastError('Koneksi terputus. Pesan gagal terkirim.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Di desktop: Enter kirim, Shift+Enter baris baru
    // Di mobile: biarkan Enter membuat baris baru
    if (e.key === 'Enter' && !e.shiftKey) {
      if (window.innerWidth >= 640) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  // 6. Guru Mengubah Status Thread ('done' atau 'new')
  const handleToggleStatus = async (newStatus: 'done' | 'new') => {
    setIsStatusUpdating(true);
    try {
      const res = await updateThreadStatusAction(thread.id, newStatus);
      if (res.success) {
        setThreadStatus(newStatus);
        success(
          newStatus === 'done'
            ? 'Percakapan telah ditandai selesai.'
            : 'Percakapan berhasil dibuka kembali.'
        );
      } else {
        showToastError(res.error || 'Gagal mengubah status percakapan.');
      }
    } catch {
      showToastError('Terjadi gangguan jaringan.');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // 7. Pengelompokan pesan berdasarkan tanggal
  const visibleMessages = messages.slice(-displayedCount);
  const groupedByDate: { [dateStr: string]: ChatMessageItem[] } = {};

  visibleMessages.forEach((msg) => {
    const dateLabel = formatChatDateSeparator(msg.created_at);
    if (!groupedByDate[dateLabel]) {
      groupedByDate[dateLabel] = [];
    }
    groupedByDate[dateLabel].push(msg);
  });

  const waLink =
    currentRole === 'teacher' && otherParty.phone
      ? buildWaLink(
          otherParty.phone,
          `Halo Bapak/Ibu ${otherParty.name}, ada pesan baru di aplikasi Sekolahku terkait topik "${thread.subject}". Silakan buka aplikasi Sekolahku untuk membaca dan membalas. Terima kasih.`
        )
      : null;

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-7.5rem)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] shadow-sm overflow-hidden">
      {/* ============================================================ */}
      {/* 1. HEADER CHAT                                               */}
      {/* ============================================================ */}
      <div className="p-3 sm:p-4 bg-white border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href={backHref}
            className="p-2 -ml-1 rounded-full text-[var(--color-text)] hover:bg-[#F2EFE9] transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Kembali ke Daftar Pesan"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold font-display text-sm sm:text-base text-[var(--color-text)] truncate">
                {otherParty.name}
              </h2>
              {thread.student_name && (
                <span className="text-[11px] text-[var(--color-text-muted)] italic truncate">
                  (Topik ananda: {thread.student_name})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs font-semibold text-[var(--color-primary)] truncate">
                {thread.subject}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#FAF7F2] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                {CATEGORY_LABELS[thread.category] || thread.category}
              </span>
              <StatusBadge status={threadStatus} size="sm" />
            </div>
          </div>
        </div>

        {/* Tombol Aksi di Header */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Tombol WhatsApp (Guru ke Ortu) */}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors min-h-[44px]"
              title="Kirim notifikasi pesan lewat WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>
          )}

          {/* Tombol Tandai Selesai / Buka Kembali (Khusus Guru) */}
          {currentRole === 'teacher' && (
            threadStatus === 'done' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleToggleStatus('new')}
                disabled={isStatusUpdating}
                className="text-xs min-h-[44px]"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Buka Kembali</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleToggleStatus('done')}
                disabled={isStatusUpdating}
                className="text-xs min-h-[44px]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[var(--color-primary)]" />
                <span>Tandai Selesai</span>
              </Button>
            )
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. AREA GELEMBUNG PESAN (CHAT SCROLL)                        */}
      {/* ============================================================ */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 bg-[#FAF7F2]"
      >
        {/* Tombol Lihat Pesan Sebelumnya jika jumlah pesan melebihi displayedCount */}
        {messages.length > displayedCount && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setDisplayedCount((prev) => prev + 30)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-stone-50 shadow-2xs"
            >
              <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
              <span>Lihat pesan sebelumnya</span>
            </button>
          </div>
        )}

        {/* Render Grup Pesan per Tanggal */}
        {Object.entries(groupedByDate).map(([dateLabel, dateMsgs]) => (
          <div key={dateLabel} className="space-y-3.5">
            {/* Pemisah Tanggal */}
            <div className="flex items-center justify-center my-2">
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#EAE5DC] text-[var(--color-text-muted)] shadow-2xs">
                {dateLabel}
              </span>
            </div>

            {/* Daftar Gelembung Pesan */}
            {dateMsgs.map((msg) => {
              const isMine = msg.sender_id === currentProfileId;
              const textTokens = parseMessageText(msg.body);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-full`}
                >
                  {!isMine && (
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)] ml-3 mb-1">
                      {msg.sender_name}
                    </span>
                  )}

                  <div
                    className={`rounded-[16px] p-3 sm:p-3.5 text-base max-w-[85%] sm:max-w-[75%] break-words shadow-2xs ${
                      isMine
                        ? 'bg-[#E8F1EE] text-[var(--color-text)] rounded-br-[4px]'
                        : 'bg-white text-[var(--color-text)] border border-[var(--color-border)] rounded-bl-[4px]'
                    }`}
                  >
                    {/* Isi Pesan Teks (Sanitasi URL) */}
                    <div className="whitespace-pre-wrap leading-relaxed text-[15px] sm:text-base">
                      {textTokens.map((tok, idx) =>
                        tok.type === 'link' ? (
                          <a
                            key={idx}
                            href={tok.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-primary)] underline hover:text-[var(--color-primary-hover)] font-medium break-all"
                          >
                            {tok.content}
                          </a>
                        ) : (
                          <React.Fragment key={idx}>{tok.content}</React.Fragment>
                        )
                      )}
                    </div>

                    {/* Lampiran Berkas (Jika Ada) */}
                    {msg.attachment_path && (
                      <div className="mt-2.5 pt-2 border-t border-black/10">
                        <a
                          href={msg.attachment_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-[8px] bg-black/5 hover:bg-black/10 transition-colors text-xs font-semibold text-[var(--color-text)]"
                        >
                          <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                          <span className="truncate flex-1">Berkas Lampiran</span>
                          <Download className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        </a>
                      </div>
                    )}

                    {/* Waktu & Status Pengiriman */}
                    <div className="flex items-center justify-end gap-1 text-[11px] text-[var(--color-text-muted)] mt-1.5 select-none">
                      <span>{formatChatMessageTime(msg.created_at)}</span>
                      {isMine && (
                        <span>
                          {msg.status === 'sending' ? (
                            <Clock className="w-3 h-3 text-stone-400 animate-pulse" />
                          ) : msg.status === 'failed' ? (
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                          ) : (
                            <Check className="w-3 h-3 text-[var(--color-primary)]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tombol Kirim Ulang jika Gagal */}
                  {isMine && msg.status === 'failed' && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-semibold mr-1">
                      <span>Gagal terkirim</span>
                      <button
                        type="button"
                        onClick={() => handleSendMessage(msg)}
                        className="underline hover:text-rose-800 ml-1"
                      >
                        Kirim Ulang
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Pill: "Pesan Baru ↓" bila sedang scroll ke atas */}
      {hasNewMessagesBelow && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold shadow-md hover:bg-[var(--color-primary-hover)] transition-transform active:scale-95 animate-bounce"
          >
            <span>Pesan baru &darr;</span>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. KOTAK KIRIM PESAN (STICKY BAWAH)                          */}
      {/* ============================================================ */}
      <div className="p-3 sm:p-4 bg-white border-t border-[var(--color-border)] shrink-0 space-y-2">
        {/* Catatan Selesai */}
        {threadStatus === 'done' && (
          <div className="p-2.5 rounded-[8px] bg-stone-100 text-stone-700 text-xs text-center border border-stone-200">
            Percakapan ini ditandai selesai. Membalas pesan akan membukanya kembali secara otomatis.
          </div>
        )}

        {/* Catatan Jam Tenang UX */}
        {quietHours.isQuiet && currentRole !== 'teacher' && (
          <div className="flex items-center gap-2 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-[6px] border border-amber-200">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Pesan tetap terkirim. Guru biasanya membalas di jam kerja (07.00 - 17.00 WIB).</span>
          </div>
        )}

        {/* Preview Berkas Lampiran yang Dipilih */}
        {selectedFile && (
          <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#FAF7F2] border border-[var(--color-border)] text-xs">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <span className="truncate font-medium">{selectedFile.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="text-xs text-stone-500 hover:text-stone-800 font-bold ml-2 px-1"
            >
              Hapus
            </button>
          </div>
        )}

        {/* Form Input Chat */}
        <div className="flex items-end gap-2">
          {/* Tombol Lampiran */}
          <div className="relative shrink-0">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              disabled={isSending}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Unggah Lampiran"
            />
            <button
              type="button"
              className="p-2.5 rounded-full text-stone-500 hover:bg-[#F2EFE9] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <UploadCloud className="w-5 h-5" />
            </button>
          </div>

          {/* Textarea Input */}
          <div className="flex-1 min-w-0">
            <textarea
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value.slice(0, 2000))}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ketik balasan pesan Anda..."
              className="w-full p-2.5 text-base sm:text-sm rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none max-h-32 min-h-[44px] leading-snug"
              disabled={isSending}
            />
          </div>

          {/* Tombol Kirim */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isSending || (!inputText.trim() && !selectedFile)}
            className="p-2.5 rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-xs"
            title="Kirim Pesan"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
