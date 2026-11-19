import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  CheckSquare,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Plus,
  BookOpen,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { ListRow } from '@/components/ui/ListRow';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { todayWIB, formatWIB, formatRelativeDeadline } from '@/lib/dates';

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function GuruClassDetailPage({
  params,
  searchParams,
}: ClassDetailPageProps) {
  const { id: classId } = await params;
  const { tab = 'absensi' } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ambil profil guru
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  // Ambil detail kelas
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      academic_year,
      homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(id, full_name)
    `)
    .eq('id', classId)
    .maybeSingle();

  if (classError || !classData) {
    notFound();
  }

  // Ambil daftar murid di kelas
  const { data: studentsData } = await supabase
    .from('student_classes')
    .select(`
      student:profiles!student_classes_student_id_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('class_id', classId);

  const students = (studentsData || [])
    .map((s: any) => s.student)
    .filter(Boolean)
    .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));

  const today = todayWIB();
  const todayFormatted = formatWIB(new Date());

  // Cek absensi hari ini
  const { data: attToday } = await supabase
    .from('attendance')
    .select('id, status')
    .eq('class_id', classId)
    .eq('date', today);

  const isRecordedToday = Boolean(attToday && attToday.length > 0);

  // Ambil daftar tugas untuk kelas ini
  const { data: assignmentsData } = await supabase
    .from('assignments')
    .select(`
      id,
      title,
      deadline,
      created_at,
      teaching:teachings!assignments_teaching_id_fkey(
        id,
        teacher_id,
        subject:subjects(name)
      ),
      submissions(
        id,
        status,
        score
      )
    `)
    .eq('teaching.class_id', classId)
    .order('deadline', { ascending: false });

  const assignments = (assignmentsData || []).map((a: any) => {
    const subs = a.submissions || [];
    const submittedCount = subs.length;
    const needGradingCount = subs.filter(
      (s: any) => s.score === null && s.status !== 'graded'
    ).length;

    return {
      id: a.id,
      title: a.title,
      deadline: a.deadline,
      subjectName: a.teaching?.subject?.name || 'Mata Pelajaran',
      isTeacherOwner: a.teaching?.teacher_id === profile.id,
      submittedCount,
      totalStudents: students.length,
      needGradingCount,
    };
  });

  return (
    <div className="space-y-6">
      {/* Navigasi Kembali */}
      <div>
        <Link
          href="/guru/kelas"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Kelas</span>
        </Link>
      </div>

      {/* Header Kelas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F1EE] text-[var(--color-primary)]">
            Tahun Ajaran {classData.academic_year}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)] mt-1">
            Kelas {classData.name}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
            Wali Kelas:{' '}
            <strong>{(classData.homeroom_teacher as any)?.full_name || '-'}</strong> &bull;{' '}
            {students.length} murid terdaftar
          </p>
        </div>

        <Button
          href={`/guru/kelas/${classId}/absen`}
          variant="primary"
          size="md"
        >
          <ClipboardCheck className="w-4 h-4 mr-1.5" />
          <span>Form Absen Cepat (1 Menit)</span>
        </Button>
      </div>

      {/* Tab Navigasi */}
      <div className="flex border-b border-[var(--color-border)] gap-6">
        <Link
          href={`/guru/kelas/${classId}?tab=absensi`}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'absensi'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Absensi
        </Link>
        <Link
          href={`/guru/kelas/${classId}?tab=tugas`}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'tugas'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Tugas ({assignments.length})
        </Link>
        <Link
          href={`/guru/kelas/${classId}?tab=murid`}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'murid'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Daftar Murid ({students.length})
        </Link>
      </div>

      {/* Konten Tab: ABSENSI */}
      {tab === 'absensi' && (
        <div className="space-y-6">
          <div className="p-5 rounded-[14px] bg-white border border-[#E6E0D6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isRecordedToday
                    ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]'
                    : 'bg-[#FAF0E6] text-[var(--color-accent)]'
                }`}
              >
                {isRecordedToday ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <ClipboardCheck className="w-6 h-6" />
                )}
              </div>
              <div>
                <span className="text-xs text-[var(--color-text-muted)] font-medium">
                  {todayFormatted}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[var(--color-text)]">
                  {isRecordedToday
                    ? 'Absensi Hari Ini Sudah Dicatat'
                    : 'Absensi Hari Ini Belum Lengkap'}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {isRecordedToday
                    ? `Tercatat ${attToday?.length} data kehadiran siswa.`
                    : 'Lakukan pencatatan kehadiran harian siswa untuk kelas ini.'}
                </p>
              </div>
            </div>

            <Button
              href={`/guru/kelas/${classId}/absen`}
              variant={isRecordedToday ? 'secondary' : 'primary'}
              size="sm"
            >
              <span>{isRecordedToday ? 'Ubah / Periksa Absen' : 'Absen Sekarang'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Konten Tab: TUGAS */}
      {tab === 'tugas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display text-[var(--color-text)]">
                Daftar Tugas Kelas {classData.name}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
                Kelola penugasan dan berikan evaluasi penilaian hasil kerja siswa.
              </p>
            </div>

            <Button
              href={`/guru/kelas/${classId}/tugas/baru`}
              variant="primary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Buat Tugas Baru</span>
            </Button>
          </div>

          <Panel>
            {assignments.length > 0 ? (
              <div className="space-y-1">
                {assignments.map((asg) => {
                  const deadlineInfo = formatRelativeDeadline(asg.deadline);

                  return (
                    <ListRow
                      key={asg.id}
                      href={`/guru/kelas/${classId}/tugas/${asg.id}`}
                      leftSlot={
                        <div className="w-10 h-10 rounded-full bg-[#E8F1EE] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                      }
                      title={
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base">
                            {asg.title}
                          </span>
                          {asg.needGradingCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]">
                              {asg.needGradingCount} perlu dinilai
                            </span>
                          )}
                        </div>
                      }
                      subtitle={
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] flex-wrap mt-0.5">
                          <span>{asg.subjectName}</span>
                          <span>&bull;</span>
                          <span
                            className={
                              deadlineInfo.isUrgent
                                ? 'font-semibold text-[var(--color-accent)]'
                                : ''
                            }
                          >
                            Batas: {deadlineInfo.label}
                          </span>
                          <span>&bull;</span>
                          <span className="font-medium text-[var(--color-text)]">
                            {asg.submittedCount} dari {asg.totalStudents} sudah kumpul
                          </span>
                        </div>
                      }
                      rightSlot={
                        <span className="text-xs font-semibold text-[var(--color-primary)]">
                          Nilai &rarr;
                        </span>
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="Belum Ada Tugas untuk Kelas Ini"
                description="Buat penugasan pertama untuk membantu proses evaluasi pembelajaran siswa."
                actionLabel="Buat Tugas Sekarang"
                actionHref={`/guru/kelas/${classId}/tugas/baru`}
              />
            )}
          </Panel>
        </div>
      )}

      {/* Konten Tab: DAFTAR MURID */}
      {tab === 'murid' && (
        <Panel
          title={`Warga Kelas ${classData.name}`}
          subtitle={`Total ${students.length} murid terdaftar dalam rombel ini`}
        >
          {students.length > 0 ? (
            <div className="space-y-1">
              {students.map((student: any, idx: number) => (
                <ListRow
                  key={student.id}
                  leftSlot={<Avatar name={student.full_name} size="sm" />}
                  title={student.full_name}
                  subtitle={student.email}
                  rightSlot={
                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                      #{idx + 1}
                    </span>
                  }
                  showChevron={false}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Belum Ada Murid di Kelas Ini"
              description="Rombel ini belum memiliki siswa yang dialokasikan."
            />
          )}
        </Panel>
      )}
    </div>
  );
}
