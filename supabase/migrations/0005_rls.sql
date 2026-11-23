-- ====================================================================
-- MIGRATION: 0005_rls.sql
-- DESKRIPSI: Row Level Security (RLS) lengkap untuk seluruh tabel schema
--             public sesuai matriks privasi PRD Sekolahku.
--             Menggunakan fungsi helper SECURITY DEFINER (STABLE),
--             pemisahan aksi (SELECT, INSERT, UPDATE, DELETE),
--             pencegahan rekursi, dan pembatasan role anonim.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. FUNGSI HELPER KEAMANAN (SECURITY DEFINER, STABLE)
-- search_path dikunci ke public untuk mencegah search_path hijacking
-- --------------------------------------------------------------------

-- 1.1 ID Profil pengguna aktif saat ini (NULL jika belum login / nonaktif)
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles
  WHERE auth_user_id = (SELECT auth.uid())
    AND is_active = true
  LIMIT 1;
$$;

-- 1.2 Role pengguna saat ini
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles
  WHERE auth_user_id = (SELECT auth.uid())
    AND is_active = true
  LIMIT 1;
$$;

-- 1.3 Cek apakah pengguna saat ini adalah Admin aktif
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = (SELECT auth.uid())
      AND role = 'admin'
      AND is_active = true
  );
$$;

-- 1.4 Kelas aktif murid
CREATE OR REPLACE FUNCTION public.student_class_id(p_student_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT class_id FROM student_classes
  WHERE student_id = p_student_id
  LIMIT 1;
$$;

-- 1.5 Cek apakah guru saat ini mengajar di kelas tsb (teachings atau wali kelas)
CREATE OR REPLACE FUNCTION public.teaches_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teachings
    WHERE class_id = p_class_id
      AND teacher_id = current_profile_id()
    UNION
    SELECT 1 FROM classes
    WHERE id = p_class_id
      AND homeroom_teacher_id = current_profile_id()
  );
$$;

-- 1.6 Cek apakah guru saat ini adalah wali kelas dari kelas tsb
CREATE OR REPLACE FUNCTION public.is_homeroom_of(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes
    WHERE id = p_class_id
      AND homeroom_teacher_id = current_profile_id()
  );
$$;

-- 1.7 Cek apakah orang tua saat ini tertaut dengan murid tsb
CREATE OR REPLACE FUNCTION public.is_parent_of(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_students
    WHERE parent_id = current_profile_id()
      AND student_id = p_student_id
  );
$$;

-- 1.8 Cek izin melihat data murid (admin, diri sendiri, orang tuanya, atau guru pengajar)
CREATE OR REPLACE FUNCTION public.can_view_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    is_admin()
    OR p_student_id = current_profile_id()
    OR is_parent_of(p_student_id)
    OR teaches_class(student_class_id(p_student_id));
$$;

-- 1.9 Cek apakah pengguna saat ini adalah peserta thread
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM thread_participants
    WHERE thread_id = p_thread_id
      AND user_id = current_profile_id()
  );
$$;

-- 1.10 Cek izin melihat profil tertentu (mencegah rekursi RLS pada tabel profiles)
CREATE OR REPLACE FUNCTION public.can_view_profile(p_target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Profil diri sendiri
    p_target_id = current_profile_id()
    -- Admin boleh melihat semua profil
    OR is_admin()
    -- Guru melihat murid yang diajar dan ortunya
    OR (
      current_user_role() = 'teacher' AND (
        EXISTS (
          SELECT 1 FROM student_classes sc
          WHERE sc.student_id = p_target_id
            AND teaches_class(sc.class_id)
        )
        OR EXISTS (
          SELECT 1 FROM parent_students ps
          JOIN student_classes sc ON sc.student_id = ps.student_id
          WHERE ps.parent_id = p_target_id
            AND teaches_class(sc.class_id)
        )
      )
    )
    -- Murid melihat gurunya dan dirinya
    OR (
      current_user_role() = 'student' AND (
        EXISTS (
          SELECT 1 FROM teachings t
          WHERE t.class_id = student_class_id(current_profile_id())
            AND t.teacher_id = p_target_id
        )
        OR EXISTS (
          SELECT 1 FROM classes c
          WHERE c.id = student_class_id(current_profile_id())
            AND c.homeroom_teacher_id = p_target_id
        )
      )
    )
    -- Orang tua melihat anaknya dan guru anaknya
    OR (
      current_user_role() = 'parent' AND (
        is_parent_of(p_target_id)
        OR EXISTS (
          SELECT 1 FROM parent_students ps
          JOIN student_classes sc ON sc.student_id = ps.student_id
          JOIN teachings t ON t.class_id = sc.class_id
          WHERE ps.parent_id = current_profile_id()
            AND t.teacher_id = p_target_id
        )
        OR EXISTS (
          SELECT 1 FROM parent_students ps
          JOIN student_classes sc ON sc.student_id = ps.student_id
          JOIN classes c ON c.id = sc.class_id
          WHERE ps.parent_id = current_profile_id()
            AND c.homeroom_teacher_id = p_target_id
        )
      )
    );
$$;

-- --------------------------------------------------------------------
-- 2. AKTIFKAN RLS PADA SEMUA TABEL
-- --------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 3. HAK AKSES ANON & AUTHENTICATED
-- Role anon sama sekali tidak memiliki hak akses data
-- --------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- --------------------------------------------------------------------
-- 4. POLICIES PER TABEL
-- --------------------------------------------------------------------

-- ====================================================================
-- 4.1 TABEL profiles
-- ====================================================================
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
TO authenticated
USING (can_view_profile(id));

CREATE POLICY "profiles_admin_insert"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
TO authenticated
USING (is_admin() OR id = current_profile_id())
WITH CHECK (is_admin() OR id = current_profile_id());

CREATE POLICY "profiles_admin_delete"
ON profiles FOR DELETE
TO authenticated
USING (is_admin());

-- Trigger membatasi user non-admin hanya boleh mengubah kolom phone
CREATE OR REPLACE FUNCTION public.trg_restrict_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id <> OLD.id OR
     NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id OR
     NEW.email <> OLD.email OR
     NEW.email_normalized <> OLD.email_normalized OR
     NEW.full_name <> OLD.full_name OR
     NEW.role <> OLD.role OR
     NEW.is_homeroom <> OLD.is_homeroom OR
     NEW.is_active <> OLD.is_active OR
     NEW.is_demo <> OLD.is_demo OR
     NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Pengguna non-admin hanya diizinkan memperbarui nomor telepon (phone)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_profile_updates ON profiles;
CREATE TRIGGER trg_restrict_profile_updates
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_restrict_profile_updates();

-- Helper RPC update nomor telepon profil sendiri
CREATE OR REPLACE FUNCTION public.update_my_phone(p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaned text;
BEGIN
  IF current_profile_id() IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: belum login atau akun tidak aktif';
  END IF;

  v_cleaned := trim(p_phone);
  IF v_cleaned = '' THEN
    v_cleaned := NULL;
  END IF;

  IF v_cleaned IS NOT NULL AND v_cleaned !~ '^(\+62|62|0)8[1-9][0-9]{6,11}$' THEN
    RAISE EXCEPTION 'Format nomor HP Indonesia tidak valid (contoh: 081234567890)';
  END IF;

  UPDATE profiles
  SET phone = v_cleaned, updated_at = now()
  WHERE id = current_profile_id();
END;
$$;

-- ====================================================================
-- 4.2 TABEL classes, subjects, schedules, teachings, student_classes, parent_students
-- ====================================================================

-- classes
CREATE POLICY "classes_select_policy"
ON classes FOR SELECT
TO authenticated
USING (
  is_admin()
  OR teaches_class(id)
  OR id = student_class_id(current_profile_id())
  OR EXISTS (
    SELECT 1 FROM parent_students ps
    JOIN student_classes sc ON sc.student_id = ps.student_id
    WHERE ps.parent_id = current_profile_id() AND sc.class_id = classes.id
  )
);

CREATE POLICY "classes_admin_insert" ON classes FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "classes_admin_update" ON classes FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "classes_admin_delete" ON classes FOR DELETE TO authenticated USING (is_admin());

-- subjects
CREATE POLICY "subjects_select_policy" ON subjects FOR SELECT TO authenticated USING (current_profile_id() IS NOT NULL);
CREATE POLICY "subjects_admin_insert" ON subjects FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "subjects_admin_update" ON subjects FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "subjects_admin_delete" ON subjects FOR DELETE TO authenticated USING (is_admin());

-- teachings
CREATE POLICY "teachings_select_policy"
ON teachings FOR SELECT
TO authenticated
USING (
  is_admin()
  OR teaches_class(class_id)
  OR class_id = student_class_id(current_profile_id())
  OR EXISTS (
    SELECT 1 FROM parent_students ps
    JOIN student_classes sc ON sc.student_id = ps.student_id
    WHERE ps.parent_id = current_profile_id() AND sc.class_id = teachings.class_id
  )
);

CREATE POLICY "teachings_admin_insert" ON teachings FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "teachings_admin_update" ON teachings FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "teachings_admin_delete" ON teachings FOR DELETE TO authenticated USING (is_admin());

-- schedules
CREATE POLICY "schedules_select_policy"
ON schedules FOR SELECT
TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM teachings t
    WHERE t.id = schedules.teaching_id
      AND (
        teaches_class(t.class_id)
        OR t.class_id = student_class_id(current_profile_id())
        OR EXISTS (
          SELECT 1 FROM parent_students ps
          JOIN student_classes sc ON sc.student_id = ps.student_id
          WHERE ps.parent_id = current_profile_id() AND sc.class_id = t.class_id
        )
      )
  )
);

CREATE POLICY "schedules_admin_insert" ON schedules FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "schedules_admin_update" ON schedules FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "schedules_admin_delete" ON schedules FOR DELETE TO authenticated USING (is_admin());

-- student_classes
CREATE POLICY "student_classes_select_policy"
ON student_classes FOR SELECT
TO authenticated
USING (
  is_admin()
  OR teaches_class(class_id)
  OR student_id = current_profile_id()
  OR is_parent_of(student_id)
);

CREATE POLICY "student_classes_admin_insert" ON student_classes FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "student_classes_admin_update" ON student_classes FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "student_classes_admin_delete" ON student_classes FOR DELETE TO authenticated USING (is_admin());

-- parent_students
CREATE POLICY "parent_students_select_policy"
ON parent_students FOR SELECT
TO authenticated
USING (
  is_admin()
  OR parent_id = current_profile_id()
  OR student_id = current_profile_id()
  OR teaches_class(student_class_id(student_id))
);

CREATE POLICY "parent_students_admin_insert" ON parent_students FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "parent_students_admin_update" ON parent_students FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "parent_students_admin_delete" ON parent_students FOR DELETE TO authenticated USING (is_admin());

-- ====================================================================
-- 4.3 TABEL attendance
-- ====================================================================
CREATE POLICY "attendance_select_policy"
ON attendance FOR SELECT
TO authenticated
USING (can_view_student(student_id));

CREATE POLICY "attendance_teacher_insert"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (teaches_class(class_id) AND NOT is_admin());

CREATE POLICY "attendance_teacher_update"
ON attendance FOR UPDATE
TO authenticated
USING (teaches_class(class_id) AND NOT is_admin())
WITH CHECK (teaches_class(class_id) AND NOT is_admin());

-- Tidak ada DELETE policy untuk attendance (dilarang hapus absensi)

-- ====================================================================
-- 4.4 TABEL leave_requests
-- ====================================================================
CREATE POLICY "leave_requests_select_policy"
ON leave_requests FOR SELECT
TO authenticated
USING (can_view_student(student_id) OR submitted_by = current_profile_id());

CREATE POLICY "leave_requests_submit_policy"
ON leave_requests FOR INSERT
TO authenticated
WITH CHECK (
  (is_parent_of(student_id) OR student_id = current_profile_id())
  AND submitted_by = current_profile_id()
  AND status = 'pending'
);

CREATE POLICY "leave_requests_homeroom_update"
ON leave_requests FOR UPDATE
TO authenticated
USING (is_homeroom_of(student_class_id(student_id)) AND NOT is_admin())
WITH CHECK (is_homeroom_of(student_class_id(student_id)) AND NOT is_admin());

-- Trigger penguncian data pengajuan izin dan pengisian reviewed_by otomatis
CREATE OR REPLACE FUNCTION public.trg_restrict_leave_request_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_homeroom_of(student_class_id(OLD.student_id)) THEN
    RAISE EXCEPTION 'Hanya wali kelas dari murid yang bersangkutan yang dapat meninjau permohonan izin';
  END IF;

  -- Kunci kolom pengajuan asli agar tidak diubah
  NEW.student_id := OLD.student_id;
  NEW.submitted_by := OLD.submitted_by;
  NEW.date_from := OLD.date_from;
  NEW.date_to := OLD.date_to;
  NEW.reason := OLD.reason;
  NEW.attachment_path := OLD.attachment_path;
  NEW.type := OLD.type;
  NEW.created_at := OLD.created_at;

  -- Isi otomatis peninjau dan waktu tinjau
  NEW.reviewed_by := current_profile_id();
  NEW.reviewed_at := now();
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_leave_request_updates ON leave_requests;
CREATE TRIGGER trg_restrict_leave_request_updates
BEFORE UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.trg_restrict_leave_request_updates();

-- ====================================================================
-- 4.5 TABEL assignments
-- ====================================================================
CREATE POLICY "assignments_select_policy"
ON assignments FOR SELECT
TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM teachings t
    WHERE t.id = assignments.teaching_id
      AND (
        teaches_class(t.class_id)
        OR t.class_id = student_class_id(current_profile_id())
        OR EXISTS (
          SELECT 1 FROM student_classes sc
          JOIN parent_students ps ON ps.student_id = sc.student_id
          WHERE sc.class_id = t.class_id AND ps.parent_id = current_profile_id()
        )
      )
  )
);

CREATE POLICY "assignments_teacher_insert"
ON assignments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teachings t
    WHERE t.id = assignments.teaching_id
      AND t.teacher_id = current_profile_id()
  )
);

CREATE POLICY "assignments_teacher_update"
ON assignments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teachings t
    WHERE t.id = assignments.teaching_id
      AND t.teacher_id = current_profile_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teachings t
    WHERE t.id = assignments.teaching_id
      AND t.teacher_id = current_profile_id()
  )
);

CREATE POLICY "assignments_teacher_delete"
ON assignments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teachings t
    WHERE t.id = assignments.teaching_id
      AND t.teacher_id = current_profile_id()
  )
);

-- ====================================================================
-- 4.6 TABEL submissions
-- ====================================================================
CREATE POLICY "submissions_select_policy"
ON submissions FOR SELECT
TO authenticated
USING (can_view_student(student_id));

CREATE POLICY "submissions_student_insert"
ON submissions FOR INSERT
TO authenticated
WITH CHECK (student_id = current_profile_id() AND score IS NULL);

CREATE POLICY "submissions_update_policy"
ON submissions FOR UPDATE
TO authenticated
USING (
  (student_id = current_profile_id() AND score IS NULL)
  OR EXISTS (
    SELECT 1 FROM assignments a
    JOIN teachings t ON t.id = a.teaching_id
    WHERE a.id = submissions.assignment_id AND t.teacher_id = current_profile_id()
  )
)
WITH CHECK (
  (student_id = current_profile_id() AND score IS NULL)
  OR EXISTS (
    SELECT 1 FROM assignments a
    JOIN teachings t ON t.id = a.teaching_id
    WHERE a.id = submissions.assignment_id AND t.teacher_id = current_profile_id()
  )
);

-- Trigger validasi peran update pada submissions
CREATE OR REPLACE FUNCTION public.trg_restrict_submission_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  v_role := current_user_role();

  -- Murid mengumpulkan / memperbarui tugas
  IF v_role = 'student' THEN
    IF OLD.score IS NOT NULL THEN
      RAISE EXCEPTION 'Tugas yang sudah dinilai tidak dapat diubah kembali oleh murid';
    END IF;

    IF NEW.score IS DISTINCT FROM OLD.score OR
       NEW.feedback IS DISTINCT FROM OLD.feedback OR
       NEW.graded_by IS DISTINCT FROM OLD.graded_by OR
       NEW.graded_at IS DISTINCT FROM OLD.graded_at OR
       NEW.status = 'graded' THEN
      RAISE EXCEPTION 'Murid tidak memiliki hak untuk mengubah kolom penilaian';
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Guru menilai tugas
  IF v_role = 'teacher' THEN
    NEW.graded_by := current_profile_id();
    IF NEW.score IS NOT NULL THEN
      NEW.status := 'graded';
      NEW.graded_at := COALESCE(NEW.graded_at, now());
    END IF;

    -- Pertahankan konten murid agar tidak dimanipulasi
    NEW.content_url := OLD.content_url;
    NEW.file_path := OLD.file_path;
    NEW.submitted_at := OLD.submitted_at;
    NEW.student_id := OLD.student_id;
    NEW.assignment_id := OLD.assignment_id;

    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_submission_updates ON submissions;
CREATE TRIGGER trg_restrict_submission_updates
BEFORE UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION public.trg_restrict_submission_updates();

-- ====================================================================
-- 4.7 TABEL announcements & reads
-- ====================================================================
CREATE POLICY "announcements_select_policy"
ON announcements FOR SELECT
TO authenticated
USING (
  is_admin()
  OR target = 'all'
  OR (
    target = 'class' AND (
      teaches_class(class_id)
      OR class_id = student_class_id(current_profile_id())
      OR EXISTS (
        SELECT 1 FROM student_classes sc
        JOIN parent_students ps ON ps.student_id = sc.student_id
        WHERE sc.class_id = announcements.class_id AND ps.parent_id = current_profile_id()
      )
    )
  )
  OR (
    target = 'parents' AND (
      current_user_role() = 'parent'
      OR author_id = current_profile_id()
      OR is_admin()
    )
  )
);

CREATE POLICY "announcements_author_insert"
ON announcements FOR INSERT
TO authenticated
WITH CHECK (
  author_id = current_profile_id()
  AND (current_user_role() = 'teacher' OR current_user_role() = 'admin')
);

CREATE POLICY "announcements_author_update"
ON announcements FOR UPDATE
TO authenticated
USING (author_id = current_profile_id())
WITH CHECK (author_id = current_profile_id());

CREATE POLICY "announcements_author_delete"
ON announcements FOR DELETE
TO authenticated
USING (author_id = current_profile_id());

-- announcement_reads
CREATE POLICY "announcement_reads_select"
ON announcement_reads FOR SELECT
TO authenticated
USING (
  user_id = current_profile_id()
  OR EXISTS (
    SELECT 1 FROM announcements a
    WHERE a.id = announcement_reads.announcement_id AND a.author_id = current_profile_id()
  )
);

CREATE POLICY "announcement_reads_insert"
ON announcement_reads FOR INSERT
TO authenticated
WITH CHECK (user_id = current_profile_id());

-- ====================================================================
-- 4.8 TABEL threads, thread_participants, messages (PRIVASI TERPUSAT)
-- ====================================================================

-- threads
CREATE POLICY "threads_participant_select"
ON threads FOR SELECT
TO authenticated
USING (is_thread_participant(id));

CREATE POLICY "threads_participant_update"
ON threads FOR UPDATE
TO authenticated
USING (is_thread_participant(id))
WITH CHECK (is_thread_participant(id));

-- Trigger: hanya guru peserta yang boleh mengubah status ke 'done'
CREATE OR REPLACE FUNCTION public.trg_restrict_thread_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    IF current_user_role() <> 'teacher' THEN
      RAISE EXCEPTION 'Hanya guru peserta yang diizinkan menyelesaikan (status done) percakapan ini';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_thread_updates ON threads;
CREATE TRIGGER trg_restrict_thread_updates
BEFORE UPDATE ON threads
FOR EACH ROW
EXECUTE FUNCTION public.trg_restrict_thread_updates();

-- thread_participants
CREATE POLICY "thread_participants_select"
ON thread_participants FOR SELECT
TO authenticated
USING (is_thread_participant(thread_id));

CREATE POLICY "thread_participants_update_last_read"
ON thread_participants FOR UPDATE
TO authenticated
USING (user_id = current_profile_id())
WITH CHECK (user_id = current_profile_id());

-- messages
CREATE POLICY "messages_participant_select"
ON messages FOR SELECT
TO authenticated
USING (is_thread_participant(thread_id));

CREATE POLICY "messages_participant_insert"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = current_profile_id()
  AND is_thread_participant(thread_id)
);

-- ====================================================================
-- 4.9 TABEL notifications
-- ====================================================================
CREATE POLICY "notifications_user_select"
ON notifications FOR SELECT
TO authenticated
USING (user_id = current_profile_id());

CREATE POLICY "notifications_user_update"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = current_profile_id())
WITH CHECK (user_id = current_profile_id());

-- Tidak ada policy INSERT langsung untuk user (hanya via fungsi create_notification)

-- --------------------------------------------------------------------
-- 5. FUNGSI RPC: create_thread (SECURITY DEFINER)
-- Menjamin transaksi atomik dan kepatuhan privasi saat membuka utas chat
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_thread(
  p_category thread_category,
  p_subject text,
  p_student_id uuid,
  p_recipient_ids uuid[],
  p_first_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role user_role;
  v_thread_id uuid;
  v_recipient_id uuid;
  v_rec_role user_role;
  v_student_cid uuid;
BEGIN
  v_caller_id := current_profile_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: sesi login tidak valid atau akun dinonaktifkan';
  END IF;

  v_caller_role := current_user_role();
  IF v_caller_role = 'admin' THEN
    RAISE EXCEPTION 'Admin tidak diizinkan membuat atau terlibat dalam thread percakapan';
  END IF;

  IF array_length(p_recipient_ids, 1) IS NULL OR array_length(p_recipient_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Daftar penerima pesan tidak boleh kosong';
  END IF;

  IF char_length(trim(p_first_message)) < 1 OR char_length(trim(p_first_message)) > 2000 THEN
    RAISE EXCEPTION 'Isi pesan pertama harus antara 1 sampai 2000 karakter';
  END IF;

  -- 1. Validasi Alur ORANG TUA -> GURU
  IF v_caller_role = 'parent' THEN
    IF p_student_id IS NULL THEN
      RAISE EXCEPTION 'Orang tua wajib menyertakan student_id anak yang dikonsultasikan';
    END IF;
    IF NOT is_parent_of(p_student_id) THEN
      RAISE EXCEPTION 'Anda bukan orang tua yang tertaut dengan murid ini';
    END IF;

    v_student_cid := student_class_id(p_student_id);

    FOREACH v_recipient_id IN ARRAY p_recipient_ids LOOP
      SELECT role INTO v_rec_role FROM profiles WHERE id = v_recipient_id AND is_active = true;
      IF v_rec_role <> 'teacher' THEN
        RAISE EXCEPTION 'Orang tua hanya boleh membuka percakapan dengan Guru';
      END IF;
      -- Guru harus mengajar di kelas anak tsb
      IF NOT EXISTS (
        SELECT 1 FROM teachings WHERE teacher_id = v_recipient_id AND class_id = v_student_cid
        UNION
        SELECT 1 FROM classes WHERE homeroom_teacher_id = v_recipient_id AND id = v_student_cid
      ) THEN
        RAISE EXCEPTION 'Guru (%) tidak mengajar di kelas anak Anda', v_recipient_id;
      END IF;
    END LOOP;

  -- 2. Validasi Alur MURID -> GURU
  ELSIF v_caller_role = 'student' THEN
    v_student_cid := student_class_id(v_caller_id);

    FOREACH v_recipient_id IN ARRAY p_recipient_ids LOOP
      SELECT role INTO v_rec_role FROM profiles WHERE id = v_recipient_id AND is_active = true;
      IF v_rec_role <> 'teacher' THEN
        RAISE EXCEPTION 'Murid hanya boleh membuka percakapan dengan Guru';
      END IF;
      -- Guru harus mengajar di kelas murid tsb
      IF NOT EXISTS (
        SELECT 1 FROM teachings WHERE teacher_id = v_recipient_id AND class_id = v_student_cid
        UNION
        SELECT 1 FROM classes WHERE homeroom_teacher_id = v_recipient_id AND id = v_student_cid
      ) THEN
        RAISE EXCEPTION 'Guru (%) tidak mengajar di kelas Anda', v_recipient_id;
      END IF;
    END LOOP;

  -- 3. Validasi Alur GURU -> ORTU atau MURID
  ELSIF v_caller_role = 'teacher' THEN
    FOREACH v_recipient_id IN ARRAY p_recipient_ids LOOP
      SELECT role INTO v_rec_role FROM profiles WHERE id = v_recipient_id AND is_active = true;
      IF v_rec_role = 'admin' THEN
        RAISE EXCEPTION 'Tidak dapat membuka percakapan dengan admin';
      ELSIF v_rec_role = 'student' THEN
        IF NOT teaches_class(student_class_id(v_recipient_id)) THEN
          RAISE EXCEPTION 'Murid (%) bukan siswa di kelas yang Anda ajar', v_recipient_id;
        END IF;
      ELSIF v_rec_role = 'parent' THEN
        IF p_student_id IS NULL THEN
          RAISE EXCEPTION 'Wajib menyertakan student_id saat menghubungi orang tua murid';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM parent_students WHERE parent_id = v_recipient_id AND student_id = p_student_id) THEN
          RAISE EXCEPTION 'Orang tua (%) tidak tertaut dengan murid (%)', v_recipient_id, p_student_id;
        END IF;
        IF NOT teaches_class(student_class_id(p_student_id)) THEN
          RAISE EXCEPTION 'Murid (%) bukan siswa di kelas yang Anda ajar', p_student_id;
        END IF;
      ELSE
        RAISE EXCEPTION 'Peran penerima tidak valid';
      END IF;
    END LOOP;
  END IF;

  -- Buat baris thread
  INSERT INTO threads (category, subject, student_id, created_by, status, created_at, updated_at)
  VALUES (p_category, trim(p_subject), p_student_id, v_caller_id, 'new', now(), now())
  RETURNING id INTO v_thread_id;

  -- Tambahkan para penerima ke thread_participants (pembuat otomatis ditambahkan via trigger after_insert)
  FOREACH v_recipient_id IN ARRAY p_recipient_ids LOOP
    INSERT INTO thread_participants (thread_id, user_id, last_read_at)
    VALUES (v_thread_id, v_recipient_id, NULL)
    ON CONFLICT (thread_id, user_id) DO NOTHING;
  END LOOP;

  -- Simpan pesan pertama
  INSERT INTO messages (thread_id, sender_id, body, created_at)
  VALUES (v_thread_id, v_caller_id, trim(p_first_message), now());

  RETURN v_thread_id;
END;
$$;

COMMENT ON FUNCTION public.create_thread(thread_category, text, uuid, uuid[], text) IS 'Fungsi RPC pembuatan thread percakapan terverifikasi dengan penegakan matriks privasi (SECURITY DEFINER)';
