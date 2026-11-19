import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  GradingCenter,
  GradingStudentItem,
} from './GradingCenter';
import { getSignedUrl } from '@/lib/storage';
import { formatDateTimeWIB, formatRelativeDeadline } from '@/lib/dates';

interface AssignmentDetailPageProps {
  params: Promise<{ id: string; assignmentId: string }>;
}

export default async function GuruAssignmentDetailPage({
  params,
}: AssignmentDetailPageProps) {
  const { id: classId, assignmentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil guru
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  // Ambil detail tugas
  const { data: asgData, error: asgError } = await supabase
    .from('assignments')
    .select(`
      id,
      title,
      description,
      deadline,
      attachment_path,
      created_at,
      teaching:teachings!assignments_teaching_id_fkey(
        id,
        class_id,
        teacher_id,
        class:classes(id, name),
        subject:subjects(name)
      )
    `)
    .eq('id', assignmentId)
    .maybeSingle();

  if (asgError || !asgData) {
    notFound();
  }

  const teaching = asgData.teaching as any;
  if (!teaching || teaching.class_id !== classId) {
    notFound();
  }

  // Guard: Hanya guru yang mengajar di kelas ini yang boleh membuka
  if (teaching.teacher_id !== profile.id) {
    redirect(`/guru/kelas/${classId}`);
  }

  // Ambil data murid kelas beserta status dari assignment_status_view
  const { data: statusRows } = await supabase
    .from('assignment_status_view')
    .select(`
      student_id,
      status,
      submission_id,
      submitted_at,
      score,
      feedback
    `)
    .eq('assignment_id', assignmentId);

  // Ambil data profil murid di rombel
  const { data: studentClasses } = await supabase
    .from('student_classes')
    .select(`
      student:profiles!student_classes_student_id_fkey(
        id,
        full_name
      )
    `)
    .eq('class_id', classId);

  // Ambil data submissions detail (content_link, attachment_path, graded_at)
  const { data: subsDetail } = await supabase
    .from('submissions')
    .select('id, content_link, attachment_path, graded_at')
    .eq('assignment_id', assignmentId);

  const subMap = new Map<string, any>();
  (subsDetail || []).forEach((s) => subMap.set(s.id, s));

  // Ambil nomor HP ortu murid
  const studentIds = (studentClasses || []).map((sc: any) => sc.student?.id);
  const { data: parentRels } = await supabase
    .from('parent_students')
    .select(`
      student_id,
      parent:profiles!parent_students_parent_id_fkey(phone)
    `)
    .in('student_id', studentIds);

  const parentPhoneMap = new Map<string, string | null>();
  (parentRels || []).forEach((rel: any) => {
    if (rel.parent) {
      parentPhoneMap.set(rel.student_id, rel.parent.phone);
    }
  });

  const statusMap = new Map<string, any>();
  (statusRows || []).forEach((r) => statusMap.set(r.student_id, r));

  const studentsList: GradingStudentItem[] = (studentClasses || []).map(
    (sc: any) => {
      const student = sc.student;
      const stRow = statusMap.get(student.id);
      const sub = stRow?.submission_id ? subMap.get(stRow.submission_id) : null;

      return {
        student_id: student.id,
        student_name: student.full_name,
        submission_id: stRow?.submission_id || null,
        status: (stRow?.status || 'not_submitted') as any,
        submitted_at: stRow?.submitted_at || null,
        content_link: sub?.content_link || null,
        attachment_path: sub?.attachment_path || null,
        score: stRow?.score !== undefined ? stRow.score : null,
        feedback: stRow?.feedback || null,
        graded_at: sub?.graded_at || null,
        parent_phone: parentPhoneMap.get(student.id) || null,
      };
    }
  );

  // Generate signed URL jika ada lampiran materi dari guru
  let teacherAttachmentUrl: string | null = null;
  if (asgData.attachment_path) {
    teacherAttachmentUrl = await getSignedUrl(asgData.attachment_path, 300);
  }

  const deadlineInfo = formatRelativeDeadline(asgData.deadline);
  const formattedDeadlineFull = formatDateTimeWIB(asgData.deadline);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/guru/kelas/${classId}?tab=tugas`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Tugas Kelas {teaching.class?.name}</span>
        </Link>
      </div>

      {/* Header Info Tugas */}
      <div className="p-5 sm:p-6 rounded-[16px] bg-white border border-[#E6E0D6] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F1EE] text-[var(--color-primary)]">
              {teaching.subject?.name || 'Mata Pelajaran'} &bull; Kelas {teaching.class?.name}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)] mt-1">
              {asgData.title}
            </h1>
          </div>

          <Button
            href={`/guru/kelas/${classId}/tugas/${assignmentId}/edit`}
            variant="secondary"
            size="sm"
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            <span>Ubah Tugas</span>
          </Button>
        </div>

        {/* Info Batas Waktu */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-text)] flex-wrap">
          <Clock className="w-4 h-4 text-[var(--color-primary)]" />
          <span>Batas Waktu: <strong>{formattedDeadlineFull}</strong></span>
          <span className="text-[var(--color-text-muted)]">({deadlineInfo.label})</span>
          {deadlineInfo.isUrgent && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
              Mendekati Batas
            </span>
          )}
        </div>

        {/* Deskripsi / Petunjuk */}
        {asgData.description && (
          <div className="text-xs sm:text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap pt-2 border-t border-[#F0EBE1]">
            {asgData.description}
          </div>
        )}

        {/* Berkas Lampiran Materi Guru */}
        {teacherAttachmentUrl && (
          <div className="pt-2 border-t border-[#F0EBE1]">
            <a
              href={teacherAttachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              <FileText className="w-4 h-4" />
              <span>Buka Berkas Soal / Materi Lampiran Guru</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Pusat Penilaian Murid */}
      <GradingCenter
        assignmentId={assignmentId}
        assignmentTitle={asgData.title}
        students={studentsList}
      />
    </div>
  );
}
