import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Users,
  Award,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface AdminClassSummaryPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminClassSummaryPage({ params }: AdminClassSummaryPageProps) {
  const { id: classId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') redirect('/login');

  // 1. Ambil info kelas
  const { data: classData } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      academic_year,
      homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(id, full_name)
    `)
    .eq('id', classId)
    .maybeSingle();

  if (!classData) {
    notFound();
  }

  // 2. Ambil data murid di kelas ini
  const { data: studentsData } = await supabase
    .from('student_classes')
    .select(`
      student:profiles!inner(
        id,
        full_name,
        email
      )
    `)
    .eq('class_id', classId);

  const students = (studentsData || []).map((s: any) => ({
    id: s.student.id,
    full_name: s.student.full_name,
    email: s.student.email,
  }));

  // 3. Ambil data absensi kelas (seluruh catatan absensi)
  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('student_id, status, date')
    .eq('class_id', classId);

  const totalRecords = attendanceData?.length || 0;
  const presentCount = attendanceData?.filter((a) => a.status === 'present').length || 0;
  const sickCount = attendanceData?.filter((a) => a.status === 'sick').length || 0;
  const excusedCount = attendanceData?.filter((a) => a.status === 'excused').length || 0;
  const absentCount = attendanceData?.filter((a) => a.status === 'absent').length || 0;

  const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 100;

  // Hitung absensi per murid untuk deteksi "Murid dengan Absensi Tinggi"
  const studentAbsenceMap = new Map<
    string,
    { sick: number; excused: number; absent: number; totalNonPresent: number }
  >();

  students.forEach((st) => {
    studentAbsenceMap.set(st.id, { sick: 0, excused: 0, absent: 0, totalNonPresent: 0 });
  });

  (attendanceData || []).forEach((att) => {
    const current = studentAbsenceMap.get(att.student_id);
    if (!current) return;

    if (att.status === 'sick') current.sick += 1;
    if (att.status === 'excused') current.excused += 1;
    if (att.status === 'absent') current.absent += 1;
    if (att.status !== 'present') current.totalNonPresent += 1;
  });

  const highAbsenceStudents = students
    .map((st) => {
      const stats = studentAbsenceMap.get(st.id) || {
        sick: 0,
        excused: 0,
        absent: 0,
        totalNonPresent: 0,
      };
      return {
        ...st,
        ...stats,
      };
    })
    .sort((a, b) => b.totalNonPresent - a.totalNonPresent);

  // 4. Ambil mata pelajaran & rerata nilai per mapel
  const { data: teachingsData } = await supabase
    .from('teachings')
    .select(`
      id,
      subject:subjects(name),
      teacher:profiles(full_name),
      assignments(
        id,
        title,
        submissions(
          id,
          grade
        )
      )
    `)
    .eq('class_id', classId);

  const subjectStats = (teachingsData || []).map((t: any) => {
    const assignments = t.assignments || [];
    let totalGrade = 0;
    let gradedCount = 0;

    assignments.forEach((asg: any) => {
      (asg.submissions || []).forEach((sub: any) => {
        if (typeof sub.grade === 'number') {
          totalGrade += sub.grade;
          gradedCount += 1;
        }
      });
    });

    const averageGrade = gradedCount > 0 ? Math.round((totalGrade / gradedCount) * 10) / 10 : null;

    return {
      subject_name: t.subject?.name || 'Mapel',
      teacher_name: t.teacher?.full_name || 'Guru',
      assignment_count: assignments.length,
      graded_submission_count: gradedCount,
      average_grade: averageGrade,
    };
  });

  return (
    <div className="space-y-6">
      {/* Tombol kembali & header */}
      <div>
        <Link
          href="/admin/kelas-mapel"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline mb-2 min-h-[32px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Kelas & Mapel</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-[14px] border border-[var(--color-border)] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--color-text)]">
                  Rekap Akademik Kelas {classData.name}
                </h1>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Tahun Ajaran {classData.academic_year} &bull; Wali Kelas:{' '}
                  <strong>{(classData.homeroom_teacher as any)?.full_name || 'Belum ditentukan'}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              href={`/admin/kelas-mapel/${classData.id}`}
              variant="secondary"
              size="sm"
              className="min-h-[44px]"
            >
              <span>Kelola Anggota & Mapel</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Ringkasan Angka Metrik Utama */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-[14px] border border-[var(--color-border)] shadow-xs">
          <p className="text-xs text-[var(--color-text-muted)] font-medium">Tingkat Kehadiran</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-display text-[var(--color-primary)]">
              {attendanceRate}%
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {presentCount} dari {totalRecords} sesi hadir
          </p>
        </div>

        <div className="bg-white p-4 rounded-[14px] border border-[var(--color-border)] shadow-xs">
          <p className="text-xs text-[var(--color-text-muted)] font-medium">Sakit & Izin</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-display text-amber-700">
              {sickCount + excusedCount}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">sesi</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {sickCount} sakit, {excusedCount} izin
          </p>
        </div>

        <div className="bg-white p-4 rounded-[14px] border border-[var(--color-border)] shadow-xs">
          <p className="text-xs text-[var(--color-text-muted)] font-medium">Alpa / Tanpa Keterangan</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold font-display ${absentCount > 0 ? 'text-rose-600' : 'text-stone-700'}`}>
              {absentCount}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">sesi</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {absentCount === 0 ? 'Kondusif (nihil alpa)' : 'Perlu pembinaan'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-[14px] border border-[var(--color-border)] shadow-xs">
          <p className="text-xs text-[var(--color-text-muted)] font-medium">Total Anggota Siswa</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-display text-[var(--color-text)]">
              {students.length}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">murid</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Aktif di rombel ini</p>
        </div>
      </div>

      {/* Grid 2 Kolom: Rata-Rata Nilai per Mapel & Rekap Absensi Murid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom 1: Rata-Rata Nilai per Mata Pelajaran */}
        <div className="bg-white rounded-[14px] border border-[var(--color-border)] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-base font-bold font-display text-[var(--color-text)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Rerata Nilai Tugas per Mata Pelajaran</span>
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Nilai dihitung dari tugas yang telah diperiksa & dinilai guru.
              </p>
            </div>
          </div>

          {subjectStats.length === 0 ? (
            <div className="text-center py-8 text-xs sm:text-sm text-[var(--color-text-muted)]">
              Belum ada mata pelajaran yang ditugaskan di kelas ini.
            </div>
          ) : (
            <div className="space-y-3">
              {subjectStats.map((sub, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-[var(--color-border)] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--color-text)] truncate">
                      {sub.subject_name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      Pengampu: {sub.teacher_name} &bull; {sub.assignment_count} Tugas dirilis
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {sub.average_grade !== null ? (
                      <div>
                        <span className="text-base font-bold font-display text-[var(--color-primary)]">
                          {sub.average_grade}
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          ({sub.graded_submission_count} nilai masuk)
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400 italic">Belum dinilai</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom 2: Rekap Absensi Murid (Murid dengan Absensi Tinggi) */}
        <div className="bg-white rounded-[14px] border border-[var(--color-border)] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="text-base font-bold font-display text-[var(--color-text)] flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Rekap Absensi Murid</span>
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Urutan murid berdasarkan frekuensi ketidakhadiran di kelas.
              </p>
            </div>
          </div>

          {highAbsenceStudents.length === 0 ? (
            <div className="text-center py-8 text-xs sm:text-sm text-[var(--color-text-muted)]">
              Belum ada data murid di kelas ini.
            </div>
          ) : (
            <div className="space-y-2">
              {highAbsenceStudents.map((st) => (
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
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      Sakit: {st.sick} &bull; Izin: {st.excused} &bull; Alpa:{' '}
                      <strong className={st.absent > 0 ? 'text-rose-600 font-semibold' : ''}>
                        {st.absent}
                      </strong>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {st.absent > 0 ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                        {st.absent}x Alpa
                      </span>
                    ) : st.totalNonPresent > 0 ? (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {st.totalNonPresent}x Izin/Sakit
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        100% Hadir
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
