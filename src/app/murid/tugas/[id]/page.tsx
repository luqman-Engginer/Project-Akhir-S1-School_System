import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, Calendar, MessageSquare, Download, CheckCircle, Award } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTimeWIB, formatRelativeDeadline } from '@/lib/dates';
import { getAttachmentSignedUrl } from '@/lib/storage';
import { MuridSubmissionForm } from './MuridSubmissionForm';

export default async function MuridTugasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil murid & kelasnya
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      student_classes(class_id, class:classes(name))
    `)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  const studentClassId = (profile as any).student_classes?.[0]?.class_id;

  // Ambil detail tugas
  const { data: assignment, error } = await supabase
    .from('assignments')
    .select(`
      id,
      title,
      description,
      deadline,
      attachment_path,
      teaching:teachings!assignments_teaching_id_fkey(
        class_id,
        teacher_id,
        subject:subjects(name),
        teacher:profiles!teachings_teacher_id_fkey(id, full_name)
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !assignment) {
    notFound();
  }

  const teaching = (assignment as any).teaching;
  // Guard RLS / kelas: pastikan murid hanya membuka tugas kelasnya
  if (teaching?.class_id !== studentClassId) {
    notFound();
  }

  // Ambil data pengumpulan murid saat ini
  const { data: submission } = await supabase
    .from('submissions')
    .select('*')
    .eq('assignment_id', id)
    .eq('student_id', profile.id)
    .maybeSingle();

  // Ambil status dari assignment_status_view
  const { data: statusView } = await supabase
    .from('assignment_status_view')
    .select('*')
    .eq('assignment_id', id)
    .eq('student_id', profile.id)
    .maybeSingle();

  const currentStatus = (statusView?.status || 'not_submitted') as
    | 'not_submitted'
    | 'submitted'
    | 'late'
    | 'graded'
    | 'overdue_not_submitted';

  const isGraded = currentStatus === 'graded';
  const relDeadline = formatRelativeDeadline(assignment.deadline);

  // Signed URL untuk materi tugas dari guru (jika ada)
  let teacherAttachmentUrl: string | null = null;
  if (assignment.attachment_path) {
    const res = await getAttachmentSignedUrl(assignment.attachment_path);
    teacherAttachmentUrl = res.signedUrl;
  }

  // Signed URL untuk berkas pengumpulan murid (jika ada)
  let studentAttachmentUrl: string | null = null;
  if (submission?.attachment_path) {
    const res = await getAttachmentSignedUrl(submission.attachment_path);
    studentAttachmentUrl = res.signedUrl;
  }

  const teacherName = teaching?.teacher?.full_name || 'Bapak/Ibu Guru';
  const subjectName = teaching?.subject?.name || 'Mata Pelajaran';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Tombol Kembali & Breadcrumb */}
      <div>
        <Link
          href="/murid/tugas"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline mb-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Kembali ke Daftar Tugas</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mt-1">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-[#F4EFEA] text-[var(--color-text-muted)]">
                {subjectName}
              </span>
              <StatusBadge status={currentStatus} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
              {assignment.title}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
              Guru Pengampu: <strong>{teacherName}</strong>
            </p>
          </div>

          {/* Tombol Tanya Guru */}
          <Button
            href={`/murid/pesan/baru?kategori=assignment&tugas=${assignment.id}&teacher=${teaching?.teacher_id || ''}`}
            variant="secondary"
            size="sm"
            className="self-start min-h-[44px]"
          >
            <MessageSquare className="w-4 h-4 mr-1.5 text-[var(--color-primary)]" />
            <span>Tanya Guru</span>
          </Button>
        </div>
      </div>

      {/* Bagian Instruksi Tugas */}
      <Panel title="Instruksi Tugas" subtitle={`Tenggat waktu: ${formatDateTimeWIB(assignment.deadline)}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-text-muted)] bg-[#FAF7F2] p-3 rounded-[8px]">
            <Clock className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span>
              Batas Pengumpulan: <strong>{relDeadline.label}</strong> ({formatDateTimeWIB(assignment.deadline)})
            </span>
          </div>

          <div className="prose prose-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
            {assignment.description || 'Tidak ada instruksi tambahan dari bapak/ibu guru.'}
          </div>

          {teacherAttachmentUrl && (
            <div className="pt-2 border-t border-[var(--color-border)]">
              <a
                href={teacherAttachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs sm:text-sm font-semibold hover:bg-emerald-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Berkas Lampiran Soal dari Guru</span>
              </a>
            </div>
          )}
        </div>
      </Panel>

      {/* Bagian Nilai & Umpan Balik (Jika sudah dinilai) */}
      {isGraded && (
        <Panel title="Hasil Penilaian" subtitle="Evaluasi tugas oleh bapak/ibu guru">
          <div className="p-4 sm:p-5 rounded-[12px] bg-[#FAF7F2] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[var(--color-primary)]" />
                <span className="text-xs sm:text-sm font-semibold text-[var(--color-text)]">
                  Nilai Akhir
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-display text-[var(--color-primary)]">
                {submission?.score ?? 0}
                <span className="text-sm font-normal text-[var(--color-text-muted)]"> / 100</span>
              </div>
            </div>

            <div className="sm:max-w-md flex-1 text-xs sm:text-sm bg-white p-3.5 rounded-[8px] border border-[var(--color-border)]">
              <span className="font-semibold block text-[var(--color-text)] mb-0.5">Umpan Balik Guru:</span>
              <p className="text-[var(--color-text-muted)] italic">
                {submission?.feedback ? `"${submission.feedback}"` : 'Belum ada catatan umpan balik khusus.'}
              </p>
              {submission?.graded_at && (
                <span className="text-[11px] text-stone-400 block mt-2">
                  Dinilai pada {formatDateTimeWIB(submission.graded_at)}
                </span>
              )}
            </div>
          </div>
        </Panel>
      )}

      {/* Bagian Pengumpulan Murid */}
      <Panel
        title="Pengumpulan Tugas Anda"
        subtitle={
          isGraded
            ? 'Tugas telah selesai dinilai'
            : submission
              ? 'Tugas telah dikumpulkan, Anda masih dapat memperbaruinya sebelum dinilai'
              : 'Silakan isi tautan berkas atau unggah file tugas Anda'
        }
      >
        <MuridSubmissionForm
          assignmentId={assignment.id}
          isGraded={isGraded}
          isOverdue={relDeadline.isOverdue}
          existingLink={submission?.content_link || null}
          existingAttachmentPath={submission?.attachment_path || null}
          existingAttachmentUrl={studentAttachmentUrl}
        />
      </Panel>
    </div>
  );
}
