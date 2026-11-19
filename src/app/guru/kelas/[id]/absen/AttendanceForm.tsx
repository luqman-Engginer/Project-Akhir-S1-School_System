'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  XCircle,
  Save,
  RotateCcw,
  AlertTriangle,
  MessageCircle,
  Info,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { saveAttendanceAction } from '@/lib/actions/attendance';
import { buildWaLink, waTemplates } from '@/lib/whatsapp';
import { formatWIB, todayWIB } from '@/lib/dates';

export type AttendanceStatus = 'present' | 'sick' | 'excused' | 'absent';

export interface RosterStudent {
  student_id: string;
  student_name: string;
  status: AttendanceStatus;
  note?: string | null;
  parent_phone?: string | null;
  parent_name?: string | null;
  approved_leave?: {
    type: 'sick' | 'excused';
    reason: string;
  } | null;
}

interface AttendanceFormProps {
  classId: string;
  className: string;
  selectedDate: string;
  initialRoster: RosterStudent[];
}

export function AttendanceForm({
  classId,
  className: classTitle,
  selectedDate,
  initialRoster,
}: AttendanceFormProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

  // State tanggal
  const [currentDate, setCurrentDate] = useState(selectedDate);

  // State data absensi murid
  const [roster, setRoster] = useState<RosterStudent[]>(initialRoster);
  const [isDirty, setIsDirty] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Update saat initialRoster berubah
  useEffect(() => {
    setRoster(initialRoster);
    setIsDirty(false);
    setSavedSuccess(false);
  }, [initialRoster]);

  // Warning saat meninggalkan halaman jika isDirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Ringkasan live status
  const summary = useMemo(() => {
    let present = 0;
    let sick = 0;
    let excused = 0;
    let absent = 0;

    roster.forEach((r) => {
      if (r.status === 'present') present++;
      else if (r.status === 'sick') sick++;
      else if (r.status === 'excused') excused++;
      else if (r.status === 'absent') absent++;
    });

    return { present, sick, excused, absent, total: roster.length };
  }, [roster]);

  // Cek apakah tanggal adalah akhir pekan (Sabtu/Minggu)
  const isWeekend = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay(); // 0: Minggu, 6: Sabtu
    return day === 0 || day === 6;
  }, [currentDate]);

  // Ubah status satu siswa
  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((student) => {
        if (student.student_id === studentId) {
          return {
            ...student,
            status: newStatus,
            // Jika kembali ke Hadir, kosongkan catatan kecuali ada izin resmi
            note: newStatus === 'present' ? null : student.note,
          };
        }
        return student;
      })
    );
    setIsDirty(true);
    setSavedSuccess(false);
  };

  // Ubah catatan siswa
  const handleNoteChange = (studentId: string, noteVal: string) => {
    setRoster((prev) =>
      prev.map((student) => {
        if (student.student_id === studentId) {
          return {
            ...student,
            note: noteVal,
          };
        }
        return student;
      })
    );
    setIsDirty(true);
  };

  // Reset semua ke Hadir (kecuali yang punya approved leave)
  const handleResetAllPresent = () => {
    setRoster((prev) =>
      prev.map((student) => {
        if (student.approved_leave) {
          return student; // pertahankan yang sudah izin resmi
        }
        return {
          ...student,
          status: 'present',
          note: null,
        };
      })
    );
    setIsDirty(true);
  };

  // Simpan absensi
  const handleSave = async () => {
    const records = roster.map((r) => ({
      student_id: r.student_id,
      status: r.status,
      note: r.status === 'present' ? null : r.note || null,
    }));

    startTransition(async () => {
      const res = await saveAttendanceAction(classId, currentDate, records);
      if (res.success) {
        success(
          'Absensi tersimpan. Orang tua murid yang tidak hadir sudah diberi tahu.'
        );
        setIsDirty(false);
        setSavedSuccess(true);
      } else {
        error(res.error || 'Gagal menyimpan absensi');
      }
    });
  };

  // Batas tanggal
  const maxDate = todayWIB();
  const minDateObj = new Date();
  minDateObj.setDate(minDateObj.getDate() - 7);
  const minDate = todayWIB(minDateObj);

  return (
    <div className="space-y-6 pb-28">
      {/* Pengatur Tanggal & Reset Cepat */}
      <div className="p-4 sm:p-5 rounded-[14px] bg-white border border-[#E6E0D6] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <label
              htmlFor="attendance-date"
              className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1"
            >
              Tanggal Absensi
            </label>
            <input
              id="attendance-date"
              type="date"
              min={minDate}
              max={maxDate}
              value={currentDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setCurrentDate(newDate);
                router.push(`/guru/kelas/${classId}/absen?date=${newDate}`);
              }}
              className="min-h-[44px] px-3.5 py-2 text-sm sm:text-base font-semibold text-[var(--color-text)] bg-[#FAF7F2] border border-[#DDD7CD] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
            />
          </div>

          <div className="self-end sm:self-center pt-2 sm:pt-4">
            <span className="text-xs text-[var(--color-text-muted)] block">
              {formatWIB(currentDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResetAllPresent}
            title="Reset semua murid menjadi Hadir"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span>Semua Hadir</span>
          </Button>
        </div>
      </div>

      {/* Peringatan Akhir Pekan jika ada */}
      {isWeekend && (
        <div
          role="alert"
          className="p-3.5 rounded-[12px] bg-[#FAF0E6] border border-[#F5D8C7] text-[#8C3B18] text-xs sm:text-sm flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Perhatian:</strong> Tanggal yang dipilih jatuh pada hari akhir pekan (Sabtu/Minggu). Pastikan ini adalah kegiatan sekolah yang terjadwal sebelum menyimpan.
          </div>
        </div>
      )}

      {/* Ringkasan Hidup (Live Counter) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-[12px] bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[var(--status-success-text)] text-center">
          <span className="text-xl font-extrabold font-display block">
            {summary.present}
          </span>
          <span className="text-xs font-semibold">Hadir</span>
        </div>

        <div className="p-3 rounded-[12px] bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] text-[var(--status-warning-text)] text-center">
          <span className="text-xl font-extrabold font-display block">
            {summary.sick}
          </span>
          <span className="text-xs font-semibold">Sakit</span>
        </div>

        <div className="p-3 rounded-[12px] bg-[var(--status-info-bg)] border border-[var(--status-info-border)] text-[var(--status-info-text)] text-center">
          <span className="text-xl font-extrabold font-display block">
            {summary.excused}
          </span>
          <span className="text-xs font-semibold">Izin</span>
        </div>

        <div className="p-3 rounded-[12px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-center">
          <span className="text-xl font-extrabold font-display block">
            {summary.absent}
          </span>
          <span className="text-xs font-semibold">Alpa</span>
        </div>
      </div>

      {/* Daftar Siswa */}
      <div className="space-y-3">
        {roster.map((student, idx) => {
          const isNonPresent = student.status !== 'present';
          const hasApprovedLeave = Boolean(student.approved_leave);

          return (
            <div
              key={student.student_id}
              className={`
                p-4 rounded-[14px] border transition-all duration-150
                ${
                  isNonPresent
                    ? 'bg-[#FAF7F2] border-[var(--color-primary)]/30 ring-1 ring-[var(--color-primary)]/10'
                    : 'bg-white border-[#E6E0D6]'
                }
              `}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Info Siswa */}
                <div className="flex items-center gap-3">
                  <Avatar name={student.student_name} size="md" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-[var(--color-text)]">
                        {student.student_name}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] font-mono">
                        #{idx + 1}
                      </span>
                      {hasApprovedLeave && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-border)]">
                          Izin Disetujui
                        </span>
                      )}
                    </div>
                    {student.parent_name && (
                      <span className="text-xs text-[var(--color-text-muted)] block mt-0.5">
                        Wali: {student.parent_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 Pilihan Status Segmented Control (Min-h 44px) */}
                <div
                  className="grid grid-cols-4 gap-1.5 p-1 bg-[#F0EBE1] rounded-[12px] self-stretch md:self-center"
                  role="radiogroup"
                  aria-label={`Status absensi untuk ${student.student_name}`}
                >
                  {/* HADIR */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={student.status === 'present'}
                    onClick={() => handleStatusChange(student.student_id, 'present')}
                    className={`
                      min-h-[44px] px-2.5 py-1.5 rounded-[10px] text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1
                      ${
                        student.status === 'present'
                          ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)] shadow-xs'
                          : 'text-[#5B676B] hover:text-[var(--color-text)] hover:bg-white/50'
                      }
                    `}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Hadir</span>
                  </button>

                  {/* SAKIT */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={student.status === 'sick'}
                    onClick={() => handleStatusChange(student.student_id, 'sick')}
                    className={`
                      min-h-[44px] px-2.5 py-1.5 rounded-[10px] text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1
                      ${
                        student.status === 'sick'
                          ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)] shadow-xs'
                          : 'text-[#5B676B] hover:text-[var(--color-text)] hover:bg-white/50'
                      }
                    `}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Sakit</span>
                  </button>

                  {/* IZIN */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={student.status === 'excused'}
                    onClick={() => handleStatusChange(student.student_id, 'excused')}
                    className={`
                      min-h-[44px] px-2.5 py-1.5 rounded-[10px] text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1
                      ${
                        student.status === 'excused'
                          ? 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-border)] shadow-xs'
                          : 'text-[#5B676B] hover:text-[var(--color-text)] hover:bg-white/50'
                      }
                    `}
                  >
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Izin</span>
                  </button>

                  {/* ALPA */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={student.status === 'absent'}
                    onClick={() => handleStatusChange(student.student_id, 'absent')}
                    className={`
                      min-h-[44px] px-2.5 py-1.5 rounded-[10px] text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1
                      ${
                        student.status === 'absent'
                          ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)] shadow-xs'
                          : 'text-[#5B676B] hover:text-[var(--color-text)] hover:bg-white/50'
                      }
                    `}
                  >
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Alpa</span>
                  </button>
                </div>
              </div>

              {/* Input Catatan Opsional (Hanya saat status bukan Hadir) */}
              {isNonPresent && (
                <div className="mt-3 pt-3 border-t border-[#F0EBE1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex-1">
                    <label
                      htmlFor={`note-${student.student_id}`}
                      className="block text-[11px] font-semibold text-[var(--color-text-muted)] uppercase mb-1"
                    >
                      Keterangan / Catatan {student.status === 'sick' ? 'Sakit' : student.status === 'excused' ? 'Izin' : 'Alpa'}
                    </label>
                    <input
                      id={`note-${student.student_id}`}
                      type="text"
                      value={student.note || ''}
                      onChange={(e) =>
                        handleNoteChange(student.student_id, e.target.value)
                      }
                      placeholder="Contoh: Sakit demam tinggi, ada surat dokter..."
                      className="w-full min-h-[40px] px-3 py-1.5 text-xs sm:text-sm rounded-[8px] bg-white border border-[#DDD7CD] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)]"
                    />
                  </div>

                  {/* Tombol Kabari via WhatsApp jika sudah disimpan */}
                  {savedSuccess && (
                    <div className="shrink-0 sm:pt-4">
                      {student.parent_phone ? (
                        (() => {
                          const formattedDate = formatWIB(currentDate, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          });
                          const waText = waTemplates.absent(
                            student.student_name,
                            formattedDate
                          );
                          const waUrl = buildWaLink(student.parent_phone, waText);

                          return waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-[#25D366] text-white text-xs font-semibold hover:bg-[#1EBE5B] transition-colors min-h-[40px] focus-visible:outline-2 focus-visible:outline-[#25D366]"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Kabari via WhatsApp</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-[var(--color-text-muted)] italic">
                              Nomor ortu tidak valid
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-[11px] text-[var(--color-text-muted)] italic">
                          Nomor orang tua belum diisi
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tombol Simpan Sticky di Bagian Bawah */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-[var(--color-border)] px-4 py-3 shadow-lg"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-[var(--color-text-muted)]">
            {isDirty ? (
              <span className="text-[var(--color-accent)] font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Ada perubahan belum disimpan</span>
              </span>
            ) : savedSuccess ? (
              <span className="text-[var(--status-success-text)] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Semua perubahan tersimpan</span>
              </span>
            ) : (
              <span>Pencatatan kelas {classTitle}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => router.push(`/guru/kelas/${classId}`)}
              disabled={isPending}
            >
              Selesai
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              loading={isPending}
              disabled={!isDirty && savedSuccess}
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-1.5" />
              <span>Simpan Absensi</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
