import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  LeaveRequestForm,
  LeaveStudentOption,
} from '@/components/academic/LeaveRequestForm';

export default async function OrtuNewLeavePage() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Profil ortu
  const { data: parentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!parentProfile) {
    redirect('/login');
  }

  // Ambil data anak-anak ortu beserta kelas & wali kelasnya
  const { data: studentRels } = await supabase
    .from('parent_students')
    .select(`
      student:profiles!parent_students_student_id_fkey(
        id,
        full_name,
        student_classes(
          class:classes(
            name,
            homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(full_name, phone)
          )
        )
      )
    `)
    .eq('parent_id', parentProfile.id);

  const students: LeaveStudentOption[] = [];
  let homeroomPhone: string | null = null;
  let homeroomName: string | null = null;

  (studentRels || []).forEach((rel: any) => {
    const s = rel.student;
    if (s) {
      const cls = s.student_classes?.[0]?.class;
      students.push({
        id: s.id,
        name: s.full_name,
        className: cls?.name,
      });

      if (!homeroomPhone && cls?.homeroom_teacher?.phone) {
        homeroomPhone = cls.homeroom_teacher.phone;
        homeroomName = cls.homeroom_teacher.full_name;
      }
    }
  });

  const activeChildCookie = cookieStore.get('active_child_id')?.value;
  const defaultStudentId =
    students.find((s) => s.id === activeChildCookie)?.id || students[0]?.id || '';

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/ortu/izin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat Izin</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
          Formulir Surat Izin Siswa
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
          Ajukan surat keterangan sakit atau izin urusan keluarga untuk putra/putri Anda.
        </p>
      </div>

      <LeaveRequestForm
        students={students}
        defaultStudentId={defaultStudentId}
        historyUrl="/ortu/izin"
        homeroomPhone={homeroomPhone}
        homeroomName={homeroomName}
      />
    </div>
  );
}
