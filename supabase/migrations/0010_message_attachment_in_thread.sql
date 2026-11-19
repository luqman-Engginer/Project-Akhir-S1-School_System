-- ====================================================================
-- 0010_message_attachment_in_thread.sql
-- Mendukung lampiran opsional pada pesan pertama saat create_thread
-- ====================================================================

CREATE OR REPLACE FUNCTION public.create_thread(
  p_category thread_category,
  p_subject text,
  p_student_id uuid,
  p_recipient_ids uuid[],
  p_first_message text,
  p_attachment_path text DEFAULT NULL
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

  -- Simpan pesan pertama beserta lampiran (jika ada)
  INSERT INTO messages (thread_id, sender_id, body, attachment_path, created_at)
  VALUES (v_thread_id, v_caller_id, trim(p_first_message), p_attachment_path, now());

  RETURN v_thread_id;
END;
$$;

COMMENT ON FUNCTION public.create_thread IS 'Fungsi RPC pembuatan thread percakapan terverifikasi dengan penegakan matriks privasi dan dukungan lampiran (SECURITY DEFINER)';
