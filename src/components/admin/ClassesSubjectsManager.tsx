'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Clock,
  User,
  Users,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  createClassAction,
  updateClassAction,
  deleteClassAction,
  createSubjectAction,
  updateSubjectAction,
  deleteSubjectAction,
  createScheduleAction,
  deleteScheduleAction,
} from '@/lib/actions/admin';
import { formatTimeSpan } from '@/lib/dates';

export interface AdminClassItem {
  id: string;
  name: string;
  academic_year: string;
  homeroom_teacher_name: string | null;
  homeroom_teacher_id: string | null;
  student_count: number;
}

export interface AdminSubjectItem {
  id: string;
  name: string;
  teaching_count: number;
}

export interface AdminTeachingOption {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  subject_name: string;
  teacher_name: string;
}

export interface AdminScheduleItem {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string;
}

interface ClassesSubjectsManagerProps {
  classes: AdminClassItem[];
  subjects: AdminSubjectItem[];
  teachers: Array<{ id: string; name: string }>;
  teachings: AdminTeachingOption[];
  schedules: AdminScheduleItem[];
}

export function ClassesSubjectsManager({
  classes,
  subjects,
  teachers,
  teachings,
  schedules,
}: ClassesSubjectsManagerProps) {
  const router = useRouter();
  const { success, error: showToastError } = useToast();

  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'schedules'>('classes');

  // Modal State Kelas
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<AdminClassItem | null>(null);
  const [classNameInput, setClassNameInput] = useState('');
  const [academicYearInput, setAcademicYearInput] = useState('2026/2027');
  const [homeroomInput, setHomeroomInput] = useState('');
  const [classLoading, setClassLoading] = useState(false);

  // Modal State Mapel
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<AdminSubjectItem | null>(null);
  const [subjectNameInput, setSubjectNameInput] = useState('');
  const [subjectLoading, setSubjectLoading] = useState(false);

  // State Jadwal
  const [selectedScheduleClassId, setSelectedScheduleClassId] = useState<string>(
    classes[0]?.id || ''
  );
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedDay, setSchedDay] = useState<number>(1);
  const [schedTeachingId, setSchedTeachingId] = useState<string>('');
  const [schedStart, setSchedStart] = useState('07:30');
  const [schedEnd, setSchedEnd] = useState('09:00');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Handler Kelas
  const openCreateClass = () => {
    setEditingClass(null);
    setClassNameInput('');
    setAcademicYearInput('2026/2027');
    setHomeroomInput('');
    setShowClassModal(true);
  };

  const openEditClass = (c: AdminClassItem) => {
    setEditingClass(c);
    setClassNameInput(c.name);
    setAcademicYearInput(c.academic_year);
    setHomeroomInput(c.homeroom_teacher_id || '');
    setShowClassModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassLoading(true);

    try {
      if (editingClass) {
        const res = await updateClassAction(editingClass.id, {
          name: classNameInput,
          academicYear: academicYearInput,
          homeroomTeacherId: homeroomInput || null,
        });
        if (res.success) {
          success('Kelas berhasil diperbarui!');
          setShowClassModal(false);
          router.refresh();
        } else {
          showToastError(res.error || 'Gagal mengubah kelas.');
        }
      } else {
        const res = await createClassAction({
          name: classNameInput,
          academicYear: academicYearInput,
          homeroomTeacherId: homeroomInput || null,
        });
        if (res.success) {
          success('Kelas baru berhasil dibuat!');
          setShowClassModal(false);
          router.refresh();
        } else {
          showToastError(res.error || 'Gagal membuat kelas.');
        }
      }
    } finally {
      setClassLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kelas ini?')) return;
    try {
      const res = await deleteClassAction(classId);
      if (res.success) {
        success('Kelas berhasil dihapus.');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal menghapus kelas.');
      }
    } catch {
      showToastError('Terjadi gangguan jaringan.');
    }
  };

  // Handler Mapel
  const openCreateSubject = () => {
    setEditingSubject(null);
    setSubjectNameInput('');
    setShowSubjectModal(true);
  };

  const openEditSubject = (s: AdminSubjectItem) => {
    setEditingSubject(s);
    setSubjectNameInput(s.name);
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectLoading(true);

    try {
      if (editingSubject) {
        const res = await updateSubjectAction(editingSubject.id, subjectNameInput);
        if (res.success) {
          success('Mata pelajaran berhasil diperbarui!');
          setShowSubjectModal(false);
          router.refresh();
        } else {
          showToastError(res.error || 'Gagal mengubah mata pelajaran.');
        }
      } else {
        const res = await createSubjectAction(subjectNameInput);
        if (res.success) {
          success('Mata pelajaran berhasil ditambahkan!');
          setShowSubjectModal(false);
          router.refresh();
        } else {
          showToastError(res.error || 'Gagal menambahkan mata pelajaran.');
        }
      }
    } finally {
      setSubjectLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus mata pelajaran ini?')) return;
    try {
      const res = await deleteSubjectAction(subjectId);
      if (res.success) {
        success('Mata pelajaran berhasil dihapus.');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal menghapus mata pelajaran.');
      }
    } catch {
      showToastError('Terjadi gangguan jaringan.');
    }
  };

  // Handler Jadwal
  const classTeachings = teachings.filter((t) => t.class_id === selectedScheduleClassId);
  const classSchedules = schedules.filter((s) => s.class_id === selectedScheduleClassId);

  const openCreateSchedule = () => {
    setSchedDay(1);
    setSchedTeachingId(classTeachings[0]?.id || '');
    setSchedStart('07:30');
    setSchedEnd('09:00');
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const teaching = classTeachings.find((t) => t.id === schedTeachingId);
    if (!teaching) {
      showToastError('Pilih mata pelajaran & guru pengampu.');
      return;
    }

    setScheduleLoading(true);

    try {
      const res = await createScheduleAction({
        classId: selectedScheduleClassId,
        teachingId: teaching.id,
        subjectId: teaching.subject_id,
        teacherId: teaching.teacher_id,
        dayOfWeek: schedDay,
        startTime: schedStart,
        endTime: schedEnd,
      });

      if (res.success) {
        success('Sesi jadwal berhasil ditambahkan!');
        setShowScheduleModal(false);
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal menambahkan jadwal.');
      }
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus sesi jadwal ini?')) return;
    try {
      const res = await deleteScheduleAction(scheduleId);
      if (res.success) {
        success('Sesi jadwal berhasil dihapus.');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal menghapus jadwal.');
      }
    } catch {
      showToastError('Terjadi gangguan jaringan.');
    }
  };

  const dayNames = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Kelas, Mapel & Jadwal
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Kelola rombongan belajar, kurikulum mata pelajaran, penugasan guru, dan jadwal mingguan KBM.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] gap-2 sm:gap-4 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'classes'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Daftar Kelas</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {classes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subjects')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'subjects'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Mata Pelajaran</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {subjects.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedules')}
          className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'schedules'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Jadwal Mingguan</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: KELAS                                                 */}
      {/* ============================================================ */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold font-display text-[var(--color-text)]">
              Rombongan Belajar ({classes.length} Kelas)
            </h2>
            <Button variant="primary" size="sm" onClick={openCreateClass} className="min-h-[44px]">
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Tambah Kelas</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold font-display text-[var(--color-text)]">
                      Kelas {cls.name}
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-stone-100 text-stone-700">
                      T.A. {cls.academic_year}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Wali Kelas: <strong>{cls.homeroom_teacher_name || 'Belum ditentukan'}</strong>
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Total Siswa: <strong>{cls.student_count} murid</strong>
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Button
                      href={`/admin/kelas-mapel/${cls.id}`}
                      variant="primary"
                      size="sm"
                    >
                      <span>Kelola Kelas</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>

                    <Button
                      href={`/admin/kelas/${cls.id}/ringkasan`}
                      variant="secondary"
                      size="sm"
                      title="Lihat Rekap Akademik Kelas"
                    >
                      <TrendingUp className="w-3.5 h-3.5 mr-1" />
                      <span>Ringkasan</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditClass(cls)}
                      className="p-2 text-stone-500 hover:text-[var(--color-primary)] rounded-[6px] hover:bg-stone-50"
                      title="Ubah info kelas"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-2 text-stone-500 hover:text-rose-600 rounded-[6px] hover:bg-stone-50"
                      title="Hapus kelas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: MATA PELAJARAN                                        */}
      {/* ============================================================ */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold font-display text-[var(--color-text)]">
              Mata Pelajaran ({subjects.length} Mapel)
            </h2>
            <Button variant="primary" size="sm" onClick={openCreateSubject} className="min-h-[44px]">
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Tambah Mapel</span>
            </Button>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-[14px] shadow-xs divide-y divide-[#F0EBE1] overflow-hidden">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-[#FAF7F2] transition-colors"
              >
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-[var(--color-text)]">
                    {sub.name}
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Ditugaskan pada {sub.teaching_count} rombel kelas
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditSubject(sub)}
                    className="p-2 text-stone-500 hover:text-[var(--color-primary)] rounded-[6px] hover:bg-stone-100"
                    title="Ubah nama mapel"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubject(sub.id)}
                    className="p-2 text-stone-500 hover:text-rose-600 rounded-[6px] hover:bg-stone-100"
                    title="Hapus mapel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: JADWAL PELAJARAN                                      */}
      {/* ============================================================ */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] bg-white border border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <label className="text-xs sm:text-sm font-bold text-[var(--color-text)] whitespace-nowrap">
                Pilih Kelas:
              </label>
              <select
                value={selectedScheduleClassId}
                onChange={(e) => setSelectedScheduleClassId(e.target.value)}
                className="p-2 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)] min-h-[40px]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={openCreateSchedule}
              disabled={classTeachings.length === 0}
              className="min-h-[40px]"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Tambah Sesi Jadwal</span>
            </Button>
          </div>

          {classTeachings.length === 0 && (
            <div className="p-3.5 rounded-[10px] bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Kelas ini belum memiliki pasangan mata pelajaran dan guru pengajar (teachings). Silakan atur penugasan di detail kelas terlebih dahulu sebelum membuat jadwal.
            </div>
          )}

          {/* Tampilan Mingguan (Senin - Jumat) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((dayNum) => {
              const daySchedules = classSchedules
                .filter((s) => s.day_of_week === dayNum)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));

              return (
                <div
                  key={dayNum}
                  className="p-4 rounded-[14px] bg-white border border-[var(--color-border)] shadow-xs flex flex-col"
                >
                  <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5 mb-3">
                    <h3 className="font-bold font-display text-base text-[var(--color-text)]">
                      {dayNames[dayNum]}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                      {daySchedules.length} Sesi
                    </span>
                  </div>

                  {daySchedules.length > 0 ? (
                    <div className="space-y-2.5 flex-1">
                      {daySchedules.map((sch) => (
                        <div
                          key={sch.id}
                          className="p-3 rounded-[8px] bg-[#FAF7F2] border border-[var(--color-border)] text-xs flex items-start justify-between gap-2"
                        >
                          <div className="space-y-1 min-w-0">
                            <span className="font-bold text-sm text-[var(--color-text)] block truncate">
                              {sch.subject_name}
                            </span>
                            <span className="text-[11px] text-[var(--color-text-muted)] block">
                              Pengampu: {sch.teacher_name}
                            </span>
                            <span className="inline-block text-[11px] font-semibold text-[var(--color-primary)] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {formatTimeSpan(sch.start_time, sch.end_time)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(sch.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors shrink-0"
                            title="Hapus sesi ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-[var(--color-text-muted)] italic flex-1 flex items-center justify-center">
                      Tidak ada jadwal sesi
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL FORM KELAS                                             */}
      {/* ============================================================ */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSaveClass}
            className="bg-white border border-[var(--color-border)] rounded-[16px] shadow-lg max-w-md w-full p-5 sm:p-6 space-y-4"
          >
            <h3 className="font-bold font-display text-base text-[var(--color-text)]">
              {editingClass ? 'Ubah Informasi Kelas' : 'Tambah Kelas Baru'}
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text)]">
                Nama Kelas (Contoh: XI RPL 1)
              </label>
              <input
                type="text"
                value={classNameInput}
                onChange={(e) => setClassNameInput(e.target.value)}
                placeholder="XI RPL 1"
                required
                className="w-full p-2.5 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text)]">
                Tahun Ajaran
              </label>
              <input
                type="text"
                value={academicYearInput}
                onChange={(e) => setAcademicYearInput(e.target.value)}
                placeholder="2026/2027"
                required
                className="w-full p-2.5 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text)]">
                Wali Kelas (Opsional)
              </label>
              <select
                value={homeroomInput}
                onChange={(e) => setHomeroomInput(e.target.value)}
                className="w-full p-2.5 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
              >
                <option value="">-- Belum Ditentukan --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setShowClassModal(false)}
                disabled={classLoading}
              >
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={classLoading}>
                {classLoading ? 'Menyimpan...' : 'Simpan Kelas'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL FORM MAPEL                                             */}
      {/* ============================================================ */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSaveSubject}
            className="bg-white border border-[var(--color-border)] rounded-[16px] shadow-lg max-w-md w-full p-5 sm:p-6 space-y-4"
          >
            <h3 className="font-bold font-display text-base text-[var(--color-text)]">
              {editingSubject ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text)]">
                Nama Mata Pelajaran
              </label>
              <input
                type="text"
                value={subjectNameInput}
                onChange={(e) => setSubjectNameInput(e.target.value)}
                placeholder="Contoh: Pemrograman Web Lanjut"
                required
                className="w-full p-2.5 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setShowSubjectModal(false)}
                disabled={subjectLoading}
              >
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={subjectLoading}>
                {subjectLoading ? 'Menyimpan...' : 'Simpan Mapel'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL FORM SESI JADWAL                                       */}
      {/* ============================================================ */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSaveSchedule}
            className="bg-white border border-[var(--color-border)] rounded-[16px] shadow-lg max-w-md w-full p-5 sm:p-6 space-y-4"
          >
            <h3 className="font-bold font-display text-base text-[var(--color-text)]">
              Tambah Sesi Jadwal Pelajaran
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text)]">
                Hari
              </label>
              <select
                value={schedDay}
                onChange={(e) => setSchedDay(Number(e.target.value))}
                className="w-full p-2.5 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
              >
                <option value={1}>Senin</option>
                <option value={2}>Selasa</option>
                <option value={3}>Rabu</option>
                <option value={4}>Kamis</option>
                <option value={5}>Jumat</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text)]">
                Pilih Pelajaran & Guru Pengampu
              </label>
              <select
                value={schedTeachingId}
                onChange={(e) => setSchedTeachingId(e.target.value)}
                className="w-full p-2.5 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
                required
              >
                {classTeachings.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.subject_name} — {t.teacher_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text)]">
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={schedStart}
                  onChange={(e) => setSchedStart(e.target.value)}
                  required
                  className="w-full p-2.5 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text)]">
                  Jam Selesai
                </label>
                <input
                  type="time"
                  value={schedEnd}
                  onChange={(e) => setSchedEnd(e.target.value)}
                  required
                  className="w-full p-2.5 text-xs sm:text-sm rounded-[8px] border border-[var(--color-border)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setShowScheduleModal(false)}
                disabled={scheduleLoading}
              >
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={scheduleLoading}>
                {scheduleLoading ? 'Memeriksa & Menyimpan...' : 'Simpan Jadwal'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
