'use client';

import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  ExternalLink,
  FileText,
  Save,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { gradeSubmissionAction } from '@/lib/actions/assignments';
import { getAttachmentSignedUrl } from '@/lib/storage';
import { buildWaLink, waTemplates } from '@/lib/whatsapp';
import { isValidHttpUrl } from '@/lib/urls';
import { formatRelativeTime, formatDateTimeWIB } from '@/lib/dates';

export interface GradingStudentItem {
  student_id: string;
  student_name: string;
  submission_id?: string | null;
  status: 'graded' | 'submitted' | 'late' | 'not_submitted' | 'overdue_not_submitted';
  submitted_at?: string | null;
  content_link?: string | null;
  attachment_path?: string | null;
  score?: number | null;
  feedback?: string | null;
  graded_by_name?: string | null;
  graded_at?: string | null;
  parent_phone?: string | null;
}

interface GradingCenterProps {
  assignmentId: string;
  assignmentTitle: string;
  students: GradingStudentItem[];
}

export function GradingCenter({
  assignmentId,
  assignmentTitle,
  students: initialStudents,
}: GradingCenterProps) {
  const { success, error } = useToast();

  const [students, setStudents] = useState<GradingStudentItem[]>(initialStudents);
  const [activeFilter, setActiveFilter] = useState<'all' | 'need_grading' | 'unsubmitted'>('all');

  // Panel siswa yang sedang dinilai
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Form penilaian
  const [scoreInput, setScoreInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [openingFile, setOpeningFile] = useState(false);

  const selectedStudent = useMemo(
    () => students.find((s) => s.student_id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  // Ringkasan metrik penilaian
  const stats = useMemo(() => {
    let gradedCount = 0;
    let totalScore = 0;
    let needGradingCount = 0;
    let unsubmittedCount = 0;

    students.forEach((s) => {
      if (s.score !== null && s.score !== undefined) {
        gradedCount++;
        totalScore += s.score;
      }
      if (s.submission_id && (s.score === null || s.score === undefined)) {
        needGradingCount++;
      }
      if (!s.submission_id) {
        unsubmittedCount++;
      }
    });

    const avgScore = gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : '-';
    return { gradedCount, avgScore, needGradingCount, unsubmittedCount, total: students.length };
  }, [students]);

  // Urutan default: Perlu dinilai -> Belum kumpul -> Sudah dinilai
  const sortedStudents = useMemo(() => {
    const list = [...students];
    list.sort((a, b) => {
      const getPriority = (item: GradingStudentItem) => {
        if (item.submission_id && (item.score === null || item.score === undefined)) return 1; // perlu dinilai
        if (!item.submission_id) return 2; // belum kumpul
        return 3; // sudah dinilai
      };
      return getPriority(a) - getPriority(b);
    });
    return list;
  }, [students]);

  // Filter daftar murid
  const filteredStudents = useMemo(() => {
    if (activeFilter === 'need_grading') {
      return sortedStudents.filter(
        (s) => s.submission_id && (s.score === null || s.score === undefined)
      );
    }
    if (activeFilter === 'unsubmitted') {
      return sortedStudents.filter((s) => !s.submission_id);
    }
    return sortedStudents;
  }, [sortedStudents, activeFilter]);

  // Daftar murid berikutnya yang perlu dinilai
  const needGradingQueue = useMemo(
    () =>
      students.filter(
        (s) => s.submission_id && (s.score === null || s.score === undefined)
      ),
    [students]
  );

  const handleSelectStudent = (student: GradingStudentItem) => {
    setSelectedStudentId(student.student_id);
    setScoreInput(
      student.score !== null && student.score !== undefined ? String(student.score) : ''
    );
    setFeedbackInput(student.feedback || '');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedStudent.submission_id) return;

    const parsedScore = Number(scoreInput);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      error('Nilai harus berupa angka antara 0 hingga 100.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await gradeSubmissionAction(
        selectedStudent.submission_id,
        parsedScore,
        feedbackInput.trim() || null
      );

      if (res.success) {
        success(`Nilai untuk ${selectedStudent.student_name} berhasil disimpan.`);

        // Update lokal state
        setStudents((prev) =>
          prev.map((s) => {
            if (s.student_id === selectedStudent.student_id) {
              return {
                ...s,
                score: parsedScore,
                feedback: feedbackInput.trim() || null,
                status: 'graded',
                graded_at: new Date().toISOString(),
              };
            }
            return s;
          })
        );

        // Cari murid berikutnya yang perlu dinilai
        const remainingQueue = needGradingQueue.filter(
          (s) => s.student_id !== selectedStudent.student_id
        );
        if (remainingQueue.length > 0) {
          handleSelectStudent(remainingQueue[0]);
        } else {
          setSelectedStudentId(null);
        }
      } else {
        error(res.error || 'Gagal menyimpan nilai');
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Terjadi gangguan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenFile = async (path: string) => {
    setOpeningFile(true);
    try {
      const res = await getAttachmentSignedUrl(path, 300);
      if (res.signedUrl) {
        window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        error(res.error || 'Gagal memuat berkas lampiran siswa.');
      }
    } catch {
      error('Gagal membuka lampiran.');
    } finally {
      setOpeningFile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Ringkasan Nilai & Progres */}
      <div className="p-4 sm:p-5 rounded-[16px] bg-white border border-[#E6E0D6] shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2 sm:p-3 rounded-[10px] bg-[#FAF7F2]">
            <span className="text-xl sm:text-2xl font-bold font-display text-[var(--color-primary)]">
              {stats.avgScore}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] block mt-0.5">
              Rata-rata Nilai
            </span>
          </div>

          <div className="p-2 sm:p-3 rounded-[10px] bg-[#FAF7F2]">
            <span className="text-xl sm:text-2xl font-bold font-display text-[var(--color-text)]">
              {stats.gradedCount} / {stats.total}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] block mt-0.5">
              Sudah Dinilai
            </span>
          </div>

          <div className="p-2 sm:p-3 rounded-[10px] bg-[#FAF7F2]">
            <span className="text-xl sm:text-2xl font-bold font-display text-[var(--color-accent)]">
              {stats.needGradingCount}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] block mt-0.5">
              Perlu Dinilai
            </span>
          </div>

          <div className="p-2 sm:p-3 rounded-[10px] bg-[#FAF7F2]">
            <span className="text-xl sm:text-2xl font-bold font-display text-[#7A4B3A]">
              {stats.unsubmittedCount}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] block mt-0.5">
              Belum Mengumpulkan
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter Tab Sederhana */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-[8px] text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-muted)] hover:bg-[#F3EFEA]'
          }`}
        >
          Semua ({students.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('need_grading')}
          className={`px-3 py-1.5 rounded-[8px] text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeFilter === 'need_grading'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-muted)] hover:bg-[#F3EFEA]'
          }`}
        >
          Perlu Dinilai ({stats.needGradingCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('unsubmitted')}
          className={`px-3 py-1.5 rounded-[8px] text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeFilter === 'unsubmitted'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-muted)] hover:bg-[#F3EFEA]'
          }`}
        >
          Belum Kumpul ({stats.unsubmittedCount})
        </button>
      </div>

      {/* 3. Layout Grid: Daftar Murid di Kiri, Panel Penilaian di Kanan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Daftar Murid */}
        <div className="lg:col-span-7 space-y-2.5">
          {filteredStudents.map((item) => {
            const isSelected = item.student_id === selectedStudentId;
            const isUnsubmitted = !item.submission_id;

            return (
              <div
                key={item.student_id}
                onClick={() => {
                  if (item.submission_id) {
                    handleSelectStudent(item);
                  }
                }}
                className={`
                  p-3.5 sm:p-4 rounded-[12px] border transition-all duration-150 flex items-center justify-between gap-3
                  ${
                    item.submission_id
                      ? 'cursor-pointer hover:border-[var(--color-primary)]'
                      : 'cursor-default opacity-85'
                  }
                  ${
                    isSelected
                      ? 'bg-[#F2F7F5] border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                      : 'bg-white border-[#E6E0D6]'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={item.student_name} size="sm" />
                  <div className="min-w-0">
                    <span className="font-semibold text-sm sm:text-base text-[var(--color-text)] block truncate">
                      {item.student_name}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] block mt-0.5">
                      {item.submitted_at
                        ? `Dikumpulkan ${formatRelativeTime(item.submitted_at)}`
                        : 'Belum ada pengumpulan'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <StatusBadge status={item.status as StatusVariant} size="sm" />

                  {item.score !== null && item.score !== undefined && (
                    <span className="font-extrabold text-sm sm:text-base text-[var(--color-primary)] ml-1">
                      {item.score}
                    </span>
                  )}

                  {/* Tombol Ingatkan via WA jika belum kumpul */}
                  {isUnsubmitted && item.parent_phone && (
                    (() => {
                      const waText = waTemplates.reminder(
                        item.student_name,
                        assignmentTitle
                      );
                      const waUrl = buildWaLink(item.parent_phone, waText);
                      if (!waUrl) return null;

                      return (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-[8px] bg-[#E8F8EE] text-[#1EBE5B] hover:bg-[#D4F2DE] transition-colors"
                          title="Ingatkan orang tua via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      );
                    })()
                  )}

                  {item.submission_id && (
                    <ChevronRight className="w-4 h-4 text-[#A0AAB0]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Kolom Panel Penilaian (Side panel di desktop, floating di mobile) */}
        <div className="lg:col-span-5">
          {selectedStudent && selectedStudent.submission_id ? (
            <div className="p-5 sm:p-6 rounded-[16px] bg-white border border-[var(--color-border)] shadow-sm space-y-4 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1]">
                <div>
                  <h3 className="font-bold font-display text-base sm:text-lg text-[var(--color-text)]">
                    Penilaian Siswa
                  </h3>
                  <span className="text-xs text-[var(--color-primary)] font-semibold">
                    {selectedStudent.student_name}
                  </span>
                </div>
                <StatusBadge
                  status={selectedStudent.status as StatusVariant}
                  size="sm"
                />
              </div>

              {/* Tinjauan Pengumpulan Siswa */}
              <div className="space-y-3 bg-[#FAF7F2] p-3.5 rounded-[12px] border border-[#DDD7CD]">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase block">
                  Berkas / Tautan Siswa
                </span>

                {/* Tautan (Link) Sanitized */}
                {selectedStudent.content_link && (
                  <div>
                    <span className="text-xs text-[var(--color-text-muted)] block mb-1">
                      Tautan Pengumpulan:
                    </span>
                    {isValidHttpUrl(selectedStudent.content_link) ? (
                      <a
                        href={selectedStudent.content_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>{selectedStudent.content_link}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--status-danger-text)]">
                        Format URL tidak valid
                      </span>
                    )}
                  </div>
                )}

                {/* Berkas Lampiran via Signed URL */}
                {selectedStudent.attachment_path && (
                  <div>
                    <span className="text-xs text-[var(--color-text-muted)] block mb-1">
                      Berkas Unggahan:
                    </span>
                    <button
                      type="button"
                      disabled={openingFile}
                      onClick={() =>
                        handleOpenFile(selectedStudent.attachment_path!)
                      }
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline cursor-pointer disabled:opacity-60"
                    >
                      <FileText className="w-4 h-4" />
                      <span>
                        {openingFile
                          ? 'Membuka dokumen...'
                          : 'Buka Dokumen Hasil Tugas Siswa'}
                      </span>
                    </button>
                  </div>
                )}

                {!selectedStudent.content_link &&
                  !selectedStudent.attachment_path && (
                    <span className="text-xs text-[var(--color-text-muted)] italic">
                      Tidak ada lampiran atau link yang disertakan.
                    </span>
                  )}
              </div>

              {/* Formulir Input Nilai */}
              <form onSubmit={handleSaveGrade} className="space-y-4">
                <div>
                  <label
                    htmlFor="grade-score"
                    className="block text-sm font-semibold text-[var(--color-text)] mb-1"
                  >
                    Nilai Angka (0 - 100) <span className="text-[var(--color-accent)]">*</span>
                  </label>
                  <input
                    id="grade-score"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    placeholder="Contoh: 85"
                    className="w-full min-h-[44px] px-3.5 py-2 text-lg font-bold text-[var(--color-text)] bg-white border border-[#DDD7CD] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    required
                  />
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    Nilai 0 adalah nilai sah bagi tugas yang tidak memenuhi syarat.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="grade-feedback"
                    className="block text-sm font-semibold text-[var(--color-text)] mb-1"
                  >
                    Catatan Evaluasi / Umpan Balik (Opsional)
                  </label>
                  <textarea
                    id="grade-feedback"
                    rows={3}
                    maxLength={1000}
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Tuliskan evaluasi perbaikan atau apresiasi terhadap hasil kerja siswa..."
                    className="w-full p-3 text-xs sm:text-sm rounded-[10px] border border-[#DDD7CD] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)] resize-none"
                  />
                </div>

                {selectedStudent.graded_at && (
                  <div className="text-[11px] text-[var(--color-text-muted)] italic">
                    Terakhir dinilai:{' '}
                    {formatDateTimeWIB(selectedStudent.graded_at)}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedStudentId(null)}
                  >
                    Tutup
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={isSaving}
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    <span>Simpan Nilai</span>
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-8 rounded-[16px] bg-[#FAF7F2] border border-dashed border-[#DDD7CD] text-center text-xs sm:text-sm text-[var(--color-text-muted)] space-y-2">
              <UserCheck className="w-8 h-8 mx-auto text-[#A0AAB0]" />
              <p className="font-semibold text-[var(--color-text)]">
                Pilih Siswa untuk Menilai
              </p>
              <p className="text-xs">
                Klik salah satu siswa dari daftar di samping yang sudah mengumpulkan tugas untuk memeriksa berkas dan memberikan nilai.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
