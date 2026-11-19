'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  GraduationCap,
  Users,
  BookOpen,
  UserPlus,
  Plus,
  Trash2,
  TrendingUp,
  UserMinus,
  Mail,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import {
  assignStudentClassAction,
  removeStudentClassAction,
  addTeachingAction,
  removeTeachingAction,
} from '@/lib/actions/admin';

export interface ClassDetailInfo {
  id: string;
  name: string;
  academic_year: string;
  homeroom_teacher_name: string | null;
  homeroom_teacher_id: string | null;
}

export interface ClassStudentItem {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  parent_count: number;
}

export interface AvailableStudentItem {
  id: string;
  full_name: string;
  email: string;
}

export interface ClassTeachingItem {
  id: string;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
}

export interface SimpleOption {
  id: string;
  name: string;
}

interface ClassDetailManagerProps {
  cls: ClassDetailInfo;
  students: ClassStudentItem[];
  availableStudents: AvailableStudentItem[];
  teachings: ClassTeachingItem[];
  availableSubjects: SimpleOption[];
  availableTeachers: SimpleOption[];
}

export function ClassDetailManager({
  cls,
  students,
  availableStudents,
  teachings,
  availableSubjects,
  availableTeachers,
}: ClassDetailManagerProps) {
  const router = useRouter();
  const { success, error: showToastError } = useToast();

  // State tambah murid
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [addStudentLoading, setAddStudentLoading] = useState(false);

  // State keluarkan murid
  const [studentToRemove, setStudentToRemove] = useState<ClassStudentItem | null>(null);
  const [removeStudentLoading, setRemoveStudentLoading] = useState(false);

  // State tambah pengajaran
  const [showAddTeachingModal, setShowAddTeachingModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [addTeachingLoading, setAddTeachingLoading] = useState(false);

  // State hapus pengajaran
  const [teachingToRemove, setTeachingToRemove] = useState<ClassTeachingItem | null>(null);
  const [removeTeachingLoading, setRemoveTeachingLoading] = useState(false);

  // Handler: Tambah murid ke kelas
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showToastError('Pilih murid yang ingin dimasukkan ke kelas.');
      return;
    }

    setAddStudentLoading(true);
    try {
      const res = await assignStudentClassAction(selectedStudentId, cls.id);
      if (res.success) {
        success('Murid berhasil dimasukkan ke dalam rombel kelas!');
        setShowAddStudentModal(false);
        setSelectedStudentId('');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal menambahkan murid.');
      }
    } finally {
      setAddStudentLoading(false);
    }
  };

  // Handler: Keluarkan murid dari kelas
  const handleConfirmRemoveStudent = async () => {
    if (!studentToRemove) return;

    setRemoveStudentLoading(true);
    try {
      const res = await removeStudentClassAction(studentToRemove.id, cls.id);
      if (res.success) {
        success(`Murid ${studentToRemove.full_name} berhasil dikeluarkan dari kelas.`);
        setStudentToRemove(null);
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal mengeluarkan murid.');
      }
    } finally {
      setRemoveStudentLoading(false);
    }
  };

  // Handler: Tambah pengajaran (guru + mapel)
  const handleAddTeaching = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !selectedTeacherId) {
      showToastError('Pilih mata pelajaran dan guru pengampu.');
      return;
    }

    setAddTeachingLoading(true);
    try {
      const res = await addTeachingAction({
        classId: cls.id,
        subjectId: selectedSubjectId,
        teacherId: selectedTeacherId,
      });

      if (res.success) {
        success('Penugasan guru mengajar berhasil ditambahkan!');
        setShowAddTeachingModal(false);
        setSelectedSubjectId('');
        setSelectedTeacherId('');
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal menambahkan penugasan guru.');
      }
    } finally {
      setAddTeachingLoading(false);
    }
  };

  // Handler: Hapus pengajaran
  const handleConfirmRemoveTeaching = async () => {
    if (!teachingToRemove) return;

    setRemoveTeachingLoading(true);
    try {
      const res = await removeTeachingAction(teachingToRemove.id, cls.id);
      if (res.success) {
        success(`Penugasan ${teachingToRemove.teacher_name} untuk mapel ${teachingToRemove.subject_name} berhasil dihapus.`);
        setTeachingToRemove(null);
        router.refresh();
      } else {
        showToastError(res.error || 'Gagal menghapus penugasan.');
      }
    } finally {
      setRemoveTeachingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tombol kembali & header */}
      <div>
        <Link
          href="/admin/kelas-mapel"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline mb-2 min-h-[32px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Kelas & Mapel</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-[14px] border border-[var(--color-border)] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--color-text)]">
                  Kelas {cls.name}
                </h1>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Tahun Ajaran {cls.academic_year} &bull; Wali Kelas:{' '}
                  <strong>{cls.homeroom_teacher_name || 'Belum ditentukan'}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              href={`/admin/kelas/${cls.id}/ringkasan`}
              variant="secondary"
              size="sm"
              className="min-h-[44px]"
            >
              <TrendingUp className="w-4 h-4 mr-1.5" />
              <span>Lihat Rekap Akademik</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom: Anggota Kelas & Penugasan Pengajar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Daftar Murid Rombel */}
        <div className="bg-white rounded-[14px] border border-[var(--color-border)] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-base font-bold font-display text-[var(--color-text)] flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Anggota Siswa</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                  {students.length} murid
                </span>
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                1 murid SMK hanya terdaftar di 1 rombongan belajar aktif.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedStudentId(availableStudents[0]?.id || '');
                setShowAddStudentModal(true);
              }}
              className="min-h-[44px]"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              <span>Tambah Murid</span>
            </Button>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-8 text-xs sm:text-sm text-[var(--color-text-muted)]">
              Belum ada murid yang didaftarkan ke kelas ini.
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-lg border border-[var(--color-border)] hover:bg-stone-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/pengguna/${st.id}`}
                      className="text-xs sm:text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] truncate block"
                    >
                      {st.full_name}
                    </Link>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)] mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-stone-400" />
                        <span>{st.email}</span>
                      </span>
                      {st.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{st.phone}</span>
                        </span>
                      )}
                      <span>
                        {st.parent_count > 0 ? (
                          <span className="text-emerald-700 font-medium">{st.parent_count} Ortu terhubung</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Belum ada ortu</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStudentToRemove(st)}
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                    title="Keluarkan dari kelas"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Penugasan Guru Mengajar (Teachings) */}
        <div className="bg-white rounded-[14px] border border-[var(--color-border)] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-base font-bold font-display text-[var(--color-text)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Mata Pelajaran & Guru Pengampu</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                  {teachings.length} mapel
                </span>
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Alokasi kurikulum mata pelajaran yang diajarkan pada kelas ini.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedSubjectId(availableSubjects[0]?.id || '');
                setSelectedTeacherId(availableTeachers[0]?.id || '');
                setShowAddTeachingModal(true);
              }}
              className="min-h-[44px]"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Tambah Mapel</span>
            </Button>
          </div>

          {teachings.length === 0 ? (
            <div className="text-center py-8 text-xs sm:text-sm text-[var(--color-text-muted)]">
              Belum ada mata pelajaran dan guru yang ditugaskan di kelas ini.
            </div>
          ) : (
            <div className="space-y-2">
              {teachings.map((tc) => (
                <div
                  key={tc.id}
                  className="p-3 rounded-lg border border-[var(--color-border)] hover:bg-stone-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--color-text)] truncate">
                      {tc.subject_name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      Guru Pengampu:{' '}
                      <Link
                        href={`/admin/pengguna/${tc.teacher_id}`}
                        className="text-[var(--color-primary)] hover:underline font-medium"
                      >
                        {tc.teacher_name}
                      </Link>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTeachingToRemove(tc)}
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                    title="Hapus penugasan mengajar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Murid ke Kelas */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[14px] max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold font-display text-[var(--color-text)]">
              Tambah Siswa ke Kelas {cls.name}
            </h3>

            {availableStudents.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Semua siswa aktif sudah terdaftar di rombel kelas masing-masing.
                </p>
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => setShowAddStudentModal(false)}>
                    Tutup
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                    Pilih Murid (Belum memiliki kelas)
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    required
                    className="w-full text-xs sm:text-sm p-2.5 rounded-[8px] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[44px]"
                  >
                    {availableStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.full_name} ({st.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddStudentModal(false)}
                    disabled={addStudentLoading}
                    className="min-h-[44px]"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={addStudentLoading || !selectedStudentId}
                    className="min-h-[44px]"
                  >
                    {addStudentLoading ? 'Menyimpan...' : 'Masukkan ke Kelas'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah Penugasan Guru (Teachings) */}
      {showAddTeachingModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[14px] max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold font-display text-[var(--color-text)]">
              Tambah Mata Pelajaran di {cls.name}
            </h3>

            <form onSubmit={handleAddTeaching} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm p-2.5 rounded-[8px] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[44px]"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                  Guru Pengampu
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm p-2.5 rounded-[8px] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[44px]"
                >
                  {availableTeachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddTeachingModal(false)}
                  disabled={addTeachingLoading}
                  className="min-h-[44px]"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={addTeachingLoading || !selectedSubjectId || !selectedTeacherId}
                  className="min-h-[44px]"
                >
                  {addTeachingLoading ? 'Menyimpan...' : 'Simpan Penugasan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Keluarkan Murid */}
      <ConfirmDialog
        isOpen={Boolean(studentToRemove)}
        onClose={() => setStudentToRemove(null)}
        onConfirm={handleConfirmRemoveStudent}
        title="Keluarkan Murid dari Kelas"
        description={`Apakah Anda yakin ingin mengeluarkan ${studentToRemove?.full_name} dari kelas ${cls.name}? Data murid tetap tersimpan di sistem.`}
        confirmLabel="Ya, Keluarkan"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={removeStudentLoading}
      />

      {/* Dialog Konfirmasi Hapus Penugasan Guru */}
      <ConfirmDialog
        isOpen={Boolean(teachingToRemove)}
        onClose={() => setTeachingToRemove(null)}
        onConfirm={handleConfirmRemoveTeaching}
        title="Hapus Penugasan Guru"
        description={`Apakah Anda yakin ingin menghapus penugasan ${teachingToRemove?.teacher_name} untuk mapel ${teachingToRemove?.subject_name}? Jika terdapat jadwal KBM atau tugas aktif yang bergantung, sistem akan menolak penghapusan.`}
        confirmLabel="Ya, Hapus Penugasan"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={removeTeachingLoading}
      />
    </div>
  );
}
