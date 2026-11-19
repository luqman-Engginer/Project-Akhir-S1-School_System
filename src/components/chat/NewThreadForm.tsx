'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  MessageSquare,
  BookOpen,
  HelpCircle,
  UploadCloud,
  Send,
  Loader2,
  AlertTriangle,
  Info,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createThreadAction } from '@/lib/actions/chat';
import { uploadAttachment } from '@/lib/storage';
import { isQuietHoursWIB } from '@/lib/chat';

export interface RecipientOption {
  id: string;
  name: string;
  role: 'teacher' | 'student' | 'parent';
  detail: string;
  isHomeroom?: boolean;
}

export interface StudentChildOption {
  id: string;
  name: string;
  className: string;
  teachers: RecipientOption[];
}

export interface TeacherClassTarget {
  classId: string;
  className: string;
  students: RecipientOption[];
  parents: Array<RecipientOption & { studentId: string; studentName: string }>;
}

interface NewThreadFormProps {
  currentRole: 'teacher' | 'student' | 'parent';
  initialCategory?: string;
  initialSubject?: string;
  initialRecipientId?: string;
  initialStudentId?: string;

  // Untuk Murid: daftar guru di kelasnya
  studentTeachers?: RecipientOption[];

  // Untuk Ortu: daftar anak & guru per anak
  parentChildren?: StudentChildOption[];

  // Untuk Guru: daftar kelas & murid/ortu per kelas
  teacherClasses?: TeacherClassTarget[];
}

const CATEGORIES = [
  {
    id: 'leave',
    label: 'Izin & Sakit',
    desc: 'Kabar ketidakhadiran, surat sakit dokter, atau keperluan keluarga.',
    icon: FileText,
  },
  {
    id: 'consultation',
    label: 'Konsultasi Belajar',
    desc: 'Bimbingan belajar, konsultasi perkembangan siswa, atau kendala di sekolah.',
    icon: MessageSquare,
  },
  {
    id: 'assignment',
    label: 'Tugas & Nilai',
    desc: 'Pertanyaan teknis tugas, klarifikasi materi, atau konfirmasi nilai.',
    icon: BookOpen,
  },
  {
    id: 'other',
    label: 'Lainnya',
    desc: 'Pertanyaan umum atau informasi lain di luar kategori di atas.',
    icon: HelpCircle,
  },
] as const;

export function NewThreadForm({
  currentRole,
  initialCategory,
  initialSubject,
  initialRecipientId,
  initialStudentId,
  studentTeachers = [],
  parentChildren = [],
  teacherClasses = [],
}: NewThreadFormProps) {
  const router = useRouter();
  const { success, error: showToastError } = useToast();

  // 1. Kategori
  const [category, setCategory] = useState<string>(
    initialCategory && ['leave', 'consultation', 'assignment', 'other'].includes(initialCategory)
      ? initialCategory
      : 'consultation'
  );

  // 2. Pemilihan Penerima berdasarkan Role
  // Ortu:
  const [selectedChildId, setSelectedChildId] = useState<string>(() => {
    if (initialStudentId && parentChildren.some((c) => c.id === initialStudentId)) {
      return initialStudentId;
    }
    return parentChildren[0]?.id || '';
  });

  const activeChild = parentChildren.find((c) => c.id === selectedChildId);
  const activeChildTeachers = activeChild?.teachers || [];

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (initialRecipientId && activeChildTeachers.some((t) => t.id === initialRecipientId)) {
      return initialRecipientId;
    }
    // Default wali kelas
    const homeroom = activeChildTeachers.find((t) => t.isHomeroom);
    return homeroom?.id || activeChildTeachers[0]?.id || '';
  });

  // Murid:
  const [selectedMuridTeacherId, setSelectedMuridTeacherId] = useState<string>(() => {
    if (initialRecipientId && studentTeachers.some((t) => t.id === initialRecipientId)) {
      return initialRecipientId;
    }
    const homeroom = studentTeachers.find((t) => t.isHomeroom);
    return homeroom?.id || studentTeachers[0]?.id || '';
  });

  // Guru:
  const [selectedClassId, setSelectedClassId] = useState<string>(teacherClasses[0]?.classId || '');
  const [teacherTargetType, setTeacherTargetType] = useState<'student' | 'parent'>('student');
  const activeTeacherClass = teacherClasses.find((c) => c.classId === selectedClassId);

  const [selectedStudentTargetId, setSelectedStudentTargetId] = useState<string>(
    activeTeacherClass?.students[0]?.id || ''
  );
  const [selectedParentTargetKey, setSelectedParentTargetKey] = useState<string>(() => {
    const firstP = activeTeacherClass?.parents[0];
    return firstP ? `${firstP.id}:${firstP.studentId}` : '';
  });

  // 3. Subjek & Isi Pesan
  const [subject, setSubject] = useState(initialSubject || '');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quietHours = isQuietHoursWIB();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length < 3) {
      setErrorMessage('Judul pesan minimal 3 karakter.');
      return;
    }
    if (trimmedMessage.length < 1) {
      setErrorMessage('Isi pesan tidak boleh kosong.');
      return;
    }

    // Tentukan recipientId dan studentId
    let recipientId = '';
    let studentId: string | null = null;
    let recipientName = 'Guru';

    if (currentRole === 'parent') {
      if (!selectedChildId || !selectedTeacherId) {
        setErrorMessage('Harap pilih data anak dan guru penerima pesan.');
        return;
      }
      recipientId = selectedTeacherId;
      studentId = selectedChildId;
      const t = activeChildTeachers.find((tch) => tch.id === selectedTeacherId);
      recipientName = t?.name || 'Bapak/Ibu Guru';
    } else if (currentRole === 'student') {
      if (!selectedMuridTeacherId) {
        setErrorMessage('Harap pilih guru penerima pesan.');
        return;
      }
      recipientId = selectedMuridTeacherId;
      const t = studentTeachers.find((tch) => tch.id === selectedMuridTeacherId);
      recipientName = t?.name || 'Bapak/Ibu Guru';
    } else if (currentRole === 'teacher') {
      if (teacherTargetType === 'student') {
        if (!selectedStudentTargetId) {
          setErrorMessage('Harap pilih murid penerima pesan.');
          return;
        }
        recipientId = selectedStudentTargetId;
        studentId = selectedStudentTargetId;
        const s = activeTeacherClass?.students.find((stu) => stu.id === selectedStudentTargetId);
        recipientName = s?.name || 'Murid';
      } else {
        if (!selectedParentTargetKey) {
          setErrorMessage('Harap pilih orang tua penerima pesan.');
          return;
        }
        const [parentId, stuId] = selectedParentTargetKey.split(':');
        recipientId = parentId;
        studentId = stuId;
        const p = activeTeacherClass?.parents.find((par) => par.id === parentId);
        recipientName = p?.name || 'Wali Murid';
      }
    }

    setLoading(true);

    try {
      let attachmentPath: string | null = null;

      // Unggah file jika ada lampiran
      if (selectedFile) {
        const uploadRes = await uploadAttachment('message', crypto.randomUUID(), selectedFile);
        if (!uploadRes.success || !uploadRes.path) {
          setErrorMessage(uploadRes.error || 'Gagal mengunggah berkas lampiran.');
          setLoading(false);
          return;
        }
        attachmentPath = uploadRes.path;
      }

      const res = await createThreadAction({
        category,
        subject: trimmedSubject,
        studentId,
        recipientIds: [recipientId],
        firstMessage: trimmedMessage,
        attachmentPath,
      });

      if (!res.success || !res.threadId) {
        setErrorMessage(res.error || 'Gagal membuka percakapan baru.');
        setLoading(false);
        return;
      }

      success(`Pesan berhasil dikirimkan ke ${recipientName}!`);
      router.push(`/${currentRole}/pesan/${res.threadId}`);
    } catch {
      setErrorMessage('Terjadi gangguan jaringan saat mengirim pesan.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-[12px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-xs sm:text-sm flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Periksa kembali data pesan Anda:</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. PILIH KATEGORI                                            */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <label className="block text-sm font-bold font-display text-[var(--color-text)]">
          1. Pilih Kategori Percakapan
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`p-4 rounded-[12px] border text-left transition-all flex items-start gap-3.5 min-h-[44px] ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-1 ring-[var(--color-primary)] shadow-2xs'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-stone-400'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[#F2EFE9] text-[var(--color-text)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-[var(--color-text)]">{cat.label}</h4>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tautan khusus jika orang tua memilih kategori Izin */}
        {currentRole === 'parent' && category === 'leave' && (
          <div className="p-3.5 rounded-[10px] bg-[#EBF2F7] border border-[#D0E0EC] text-xs text-[#2C496A] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#3D5A80] shrink-0" />
              <span>
                Mau mengajukan izin resmi atau surat sakit tercatat?
              </span>
            </div>
            <Link
              href="/ortu/izin/baru"
              className="font-bold underline hover:text-[#1A334E] shrink-0 text-xs"
            >
              Gunakan Formulir Izin &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. PILIH PENERIMA                                            */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <label className="block text-sm font-bold font-display text-[var(--color-text)]">
          2. Penerima Pesan
        </label>

        {/* Form Ortu */}
        {currentRole === 'parent' && (
          <div className="space-y-4 p-4 rounded-[12px] bg-white border border-[var(--color-border)] shadow-xs">
            {parentChildren.length > 1 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text)]">
                  Pilih Ananda:
                </label>
                <select
                  value={selectedChildId}
                  onChange={(e) => {
                    setSelectedChildId(e.target.value);
                    const newChild = parentChildren.find((c) => c.id === e.target.value);
                    const homeroom = newChild?.teachers.find((t) => t.isHomeroom);
                    setSelectedTeacherId(homeroom?.id || newChild?.teachers[0]?.id || '');
                  }}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] min-h-[44px]"
                >
                  {parentChildren.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.className})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text)]">
                Pilih Bapak/Ibu Guru (Pengajar kelas {activeChild?.className || ''}):
              </label>
              {activeChildTeachers.length > 0 ? (
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] min-h-[44px]"
                >
                  {activeChildTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.detail} {t.isHomeroom ? '⭐ (Wali Kelas)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)] italic">
                  Belum ada guru yang terdaftar mengajar di kelas ananda.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Form Murid */}
        {currentRole === 'student' && (
          <div className="p-4 rounded-[12px] bg-white border border-[var(--color-border)] shadow-xs space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--color-text)]">
              Pilih Guru Pengajar di Kelasmu:
            </label>
            {studentTeachers.length > 0 ? (
              <select
                value={selectedMuridTeacherId}
                onChange={(e) => setSelectedMuridTeacherId(e.target.value)}
                className="w-full p-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] min-h-[44px]"
              >
                {studentTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.detail} {t.isHomeroom ? '⭐ (Wali Kelas)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)] italic">
                Belum ada daftar guru untuk kelas Anda.
              </p>
            )}
          </div>
        )}

        {/* Form Guru */}
        {currentRole === 'teacher' && (
          <div className="p-4 rounded-[12px] bg-white border border-[var(--color-border)] shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text)]">
                  Kelas Bimbingan:
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    const newCls = teacherClasses.find((c) => c.classId === e.target.value);
                    setSelectedStudentTargetId(newCls?.students[0]?.id || '');
                    const firstP = newCls?.parents[0];
                    setSelectedParentTargetKey(firstP ? `${firstP.id}:${firstP.studentId}` : '');
                  }}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] min-h-[44px]"
                >
                  {teacherClasses.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text)]">
                  Hubungi:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTeacherTargetType('student')}
                    className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-[8px] border transition-colors min-h-[44px] ${
                      teacherTargetType === 'student'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    Murid
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherTargetType('parent')}
                    className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-[8px] border transition-colors min-h-[44px] ${
                      teacherTargetType === 'parent'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    Orang Tua
                  </button>
                </div>
              </div>
            </div>

            {teacherTargetType === 'student' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text)]">
                  Pilih Siswa:
                </label>
                <select
                  value={selectedStudentTargetId}
                  onChange={(e) => setSelectedStudentTargetId(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] min-h-[44px]"
                >
                  {(activeTeacherClass?.students || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.detail})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text)]">
                  Pilih Orang Tua (Wali Siswa):
                </label>
                {(activeTeacherClass?.parents || []).length > 0 ? (
                  <select
                    value={selectedParentTargetKey}
                    onChange={(e) => setSelectedParentTargetKey(e.target.value)}
                    className="w-full p-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] min-h-[44px]"
                  >
                    {activeTeacherClass?.parents.map((p) => (
                      <option key={`${p.id}:${p.studentId}`} value={`${p.id}:${p.studentId}`}>
                        {p.name} (Wali dari: {p.studentName})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)] italic">
                    Belum ada data orang tua yang tertaut di kelas ini.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. JUDUL PESAN                                               */}
      {/* ============================================================ */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <label className="block text-sm font-bold font-display text-[var(--color-text)]">
            3. Judul / Subjek Percakapan
          </label>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {subject.length}/100 karakter
          </span>
        </div>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value.slice(0, 100))}
          placeholder="Contoh: Izin tidak masuk karena demam atau Pertanyaan Tugas Modul 3"
          className="w-full p-3 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] min-h-[44px]"
          disabled={loading}
        />
      </div>

      {/* ============================================================ */}
      {/* 4. ISI PESAN & LAMPIRAN                                      */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <label className="block text-sm font-bold font-display text-[var(--color-text)]">
            4. Isi Pesan Pertama
          </label>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {message.length}/2000 karakter
          </span>
        </div>

        {/* Jam Tenang UX Note */}
        {quietHours.isQuiet && currentRole !== 'teacher' && (
          <div className="p-3 rounded-[10px] bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Pesan tetap terkirim. Bapak/Ibu Guru biasanya membaca dan membalas di jam kerja sekolah (07.00 - 17.00 WIB).
            </span>
          </div>
        )}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
          rows={5}
          placeholder="Tuliskan pesan Anda secara jelas dan sopan..."
          className="w-full p-3.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] leading-relaxed resize-none"
          disabled={loading}
        />

        {/* Input Unggah Berkas */}
        <div className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-[12px] p-4 text-center transition-colors bg-[var(--color-surface)] relative">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setSelectedFile(e.target.files[0]);
              }
            }}
            disabled={loading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-6 h-6 text-[var(--color-text-muted)] mb-1" />
            <p className="text-xs font-semibold text-[var(--color-text)]">
              {selectedFile ? selectedFile.name : 'Lampirkan Berkas Opsional (PDF, PNG, JPG, DOCX)'}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Maksimal 5 MB
            </p>
          </div>
        </div>
      </div>

      {/* Tombol Kirim */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          className="w-full sm:w-auto min-h-[44px]"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Mengirim Pesan...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span>Buka Percakapan & Kirim Pesan</span>
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
