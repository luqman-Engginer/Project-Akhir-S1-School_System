-- ====================================================================
-- MIGRATION: 0007_storage.sql
-- DESKRIPSI: Konfigurasi Supabase Storage bucket privat "attachments",
--             pembatasan MIME type & ukuran 5MB, serta policy RLS pada
--             storage.objects untuk penegakan privasi lampiran.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. SETUP BUCKET: attachments
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  5242880, -- 5 MB dalam bytes
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- --------------------------------------------------------------------
-- 2. FUNGSI HELPER AKSES LAMPIRAN (SECURITY DEFINER)
-- Format path: <jenis>/<id_terkait>/<uuid>-<nama_file_aman>
-- Jenis: assignment, submission, leave, message
-- --------------------------------------------------------------------

-- 2.1 Cek izin baca lampiran (SELECT)
CREATE OR REPLACE FUNCTION public.can_access_attachment(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_related_text text;
  v_related_id uuid;
BEGIN
  IF current_profile_id() IS NULL THEN
    RETURN false;
  END IF;

  v_kind := split_part(p_object_name, '/', 1);
  v_related_text := split_part(p_object_name, '/', 2);

  -- Pastikan parameter id berupa UUID valid
  BEGIN
    v_related_id := v_related_text::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END IF;

  -- 1. Lampiran Tugas (assignment)
  IF v_kind = 'assignment' THEN
    RETURN is_admin() OR EXISTS (
      SELECT 1 FROM assignments a
      JOIN teachings t ON t.id = a.teaching_id
      WHERE (a.id = v_related_id OR t.id = v_related_id)
        AND (
          teaches_class(t.class_id)
          OR t.class_id = student_class_id(current_profile_id())
          OR EXISTS (
            SELECT 1 FROM student_classes sc
            JOIN parent_students ps ON ps.student_id = sc.student_id
            WHERE sc.class_id = t.class_id AND ps.parent_id = current_profile_id()
          )
        )
    );

  -- 2. Lampiran Pengumpulan Tugas (submission)
  ELSIF v_kind = 'submission' THEN
    RETURN EXISTS (
      SELECT 1 FROM submissions s
      WHERE s.id = v_related_id AND can_view_student(s.student_id)
    ) OR EXISTS (
      -- Jika related_id adalah assignment_id
      SELECT 1 FROM assignments a
      JOIN teachings t ON t.id = a.teaching_id
      WHERE a.id = v_related_id
        AND (
          teaches_class(t.class_id)
          OR t.class_id = student_class_id(current_profile_id())
          OR is_admin()
        )
    );

  -- 3. Lampiran Surat Izin / Sakit (leave)
  ELSIF v_kind = 'leave' THEN
    RETURN EXISTS (
      SELECT 1 FROM leave_requests lr
      WHERE lr.id = v_related_id
        AND (can_view_student(lr.student_id) OR lr.submitted_by = current_profile_id())
    ) OR (
      -- Saat sedang mengupload sebelum row dibuat
      current_user_role() IN ('student', 'parent')
    );

  -- 4. Lampiran Pesan Percakapan (message)
  ELSIF v_kind = 'message' THEN
    RETURN is_thread_participant(v_related_id);
  END IF;

  RETURN false;
END;
$$;

-- 2.2 Cek izin unggah lampiran (INSERT)
CREATE OR REPLACE FUNCTION public.can_upload_attachment(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_related_text text;
  v_related_id uuid;
BEGIN
  IF current_profile_id() IS NULL THEN
    RETURN false;
  END IF;

  v_kind := split_part(p_object_name, '/', 1);
  v_related_text := split_part(p_object_name, '/', 2);

  BEGIN
    v_related_id := v_related_text::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END IF;

  -- 1. Guru mengunggah tugas pada mapelnya
  IF v_kind = 'assignment' THEN
    RETURN EXISTS (
      SELECT 1 FROM teachings t
      WHERE (t.id = v_related_id OR EXISTS (SELECT 1 FROM assignments a WHERE a.id = v_related_id AND a.teaching_id = t.id))
        AND t.teacher_id = current_profile_id()
    );

  -- 2. Murid mengunggah jawaban tugas kelasnya
  ELSIF v_kind = 'submission' THEN
    RETURN current_user_role() = 'student' AND (
      EXISTS (
        SELECT 1 FROM assignments a
        JOIN teachings t ON t.id = a.teaching_id
        WHERE a.id = v_related_id
          AND t.class_id = student_class_id(current_profile_id())
      )
      OR EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.id = v_related_id
          AND s.student_id = current_profile_id()
          AND s.score IS NULL
      )
    );

  -- 3. Murid / Ortu mengunggah surat izin
  ELSIF v_kind = 'leave' THEN
    RETURN current_user_role() IN ('student', 'parent');

  -- 4. Peserta thread mengunggah lampiran pesan
  ELSIF v_kind = 'message' THEN
    RETURN is_thread_participant(v_related_id);
  END IF;

  RETURN false;
END;
$$;

-- 2.3 Cek izin hapus lampiran (DELETE)
CREATE OR REPLACE FUNCTION public.can_delete_attachment(p_object_name text, p_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_related_text text;
  v_related_id uuid;
BEGIN
  -- Hanya pemilik file auth (auth.uid) yang boleh menghapus
  IF p_owner_id <> (SELECT auth.uid()) THEN
    RETURN false;
  END IF;

  v_kind := split_part(p_object_name, '/', 1);
  v_related_text := split_part(p_object_name, '/', 2);

  BEGIN
    v_related_id := v_related_text::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN true;
  END IF;

  -- Untuk submission: tidak boleh dihapus jika sudah dinilai
  IF v_kind = 'submission' THEN
    IF EXISTS (
      SELECT 1 FROM submissions s
      WHERE (s.id = v_related_id OR s.file_path LIKE '%' || p_object_name || '%')
        AND s.score IS NOT NULL
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- --------------------------------------------------------------------
-- 3. STORAGE POLICIES PADA storage.objects
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "storage_attachments_select" ON storage.objects;
CREATE POLICY "storage_attachments_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND can_access_attachment(name)
);

DROP POLICY IF EXISTS "storage_attachments_insert" ON storage.objects;
CREATE POLICY "storage_attachments_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND can_upload_attachment(name)
);

DROP POLICY IF EXISTS "storage_attachments_delete" ON storage.objects;
CREATE POLICY "storage_attachments_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND can_delete_attachment(name, owner)
);
