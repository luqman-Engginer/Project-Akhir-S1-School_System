-- ====================================================================
-- MIGRATION: 0006_automation.sql
-- DESKRIPSI: Automasi notifikasi, integrasi alur persetujuan izin ke
--             kehadiran, pengingat deadline tugas, anti-spam, dan
--             pembersihan notifikasi kedaluwarsa.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. PEMBAHARUAN FUNGSI create_notification (ANTI-SPAM 5 MENIT)
-- Melewati notifikasi duplikat identik (user, tipe, judul, isi)
-- yang terjadi dalam rentang 5 menit terakhir.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type notification_type,
  p_title text,
  p_body text,
  p_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Anti-Spam: Cek apakah notifikasi yang sama persis sudah dikirim dalam 5 menit terakhir
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = p_user_id
      AND type = p_type
      AND title = p_title
      AND body = p_body
      AND created_at >= (now() - interval '5 minutes')
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, link, is_read, created_at)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, false, now())
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Mencegah transaksi pemanggil gagal hanya karena isu notifikasi
    RETURN NULL;
END;
$$;

-- --------------------------------------------------------------------
-- 2. TRIGGER NOTIFIKASI ABSENSI (AFTER INSERT OR UPDATE)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_attendance_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name text;
  v_parent RECORD;
  v_status_text text;
  v_date_str text;
BEGIN
  -- 1. Jangan proses jika status tidak berubah pada operasi UPDATE
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- 2. Ambil nama murid
  SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;
  v_student_name := COALESCE(v_student_name, 'Anak Anda');
  v_date_str := to_char(NEW.date, 'DD/MM/YYYY');

  -- 3. Skenario: Status bukan 'present' (sakit, izin, atau alpa)
  IF NEW.status <> 'present' THEN
    v_status_text := CASE NEW.status
      WHEN 'sick' THEN 'sakit'
      WHEN 'excused' THEN 'izin'
      WHEN 'absent' THEN 'alpa (tanpa keterangan)'
      ELSE 'tidak hadir'
    END;

    FOR v_parent IN
      SELECT parent_id FROM parent_students WHERE student_id = NEW.student_id
    LOOP
      PERFORM create_notification(
        v_parent.parent_id,
        'attendance',
        'Kehadiran ' || v_student_name,
        v_student_name || ' tercatat ' || v_status_text || ' pada ' || v_date_str || '.',
        '/ortu/perkembangan'
      );
    END LOOP;

  -- 4. Skenario: Koreksi dari tidak hadir kembali menjadi 'present'
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> 'present' AND NEW.status = 'present' THEN
    FOR v_parent IN
      SELECT parent_id FROM parent_students WHERE student_id = NEW.student_id
    LOOP
      PERFORM create_notification(
        v_parent.parent_id,
        'attendance',
        'Kehadiran ' || v_student_name,
        'Kehadiran ' || v_student_name || ' diperbarui menjadi hadir pada ' || v_date_str || '.',
        '/ortu/perkembangan'
      );
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_notification ON attendance;
CREATE TRIGGER trg_attendance_notification
AFTER INSERT OR UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION public.trg_attendance_notification();

-- --------------------------------------------------------------------
-- 3. TRIGGER NOTIFIKASI & OTOMASI IZIN (leave_requests)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_leave_request_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name text;
  v_class_id uuid;
  v_homeroom_id uuid;
  v_type_text text;
  v_cur_date date;
  v_parent RECORD;
  v_att_status attendance_status;
BEGIN
  SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;
  v_student_name := COALESCE(v_student_name, 'Murid');
  v_class_id := student_class_id(NEW.student_id);

  -- 3.1 PADA SAAT PENGAJUAN BARU (AFTER INSERT)
  IF TG_OP = 'INSERT' THEN
    SELECT homeroom_teacher_id INTO v_homeroom_id FROM classes WHERE id = v_class_id;

    IF v_homeroom_id IS NOT NULL THEN
      v_type_text := CASE WHEN NEW.type = 'sick' THEN 'sakit' ELSE 'izin' END;
      PERFORM create_notification(
        v_homeroom_id,
        'leave',
        'Pengajuan Izin: ' || v_student_name,
        v_student_name || ' mengajukan surat ' || v_type_text || ' (' || to_char(NEW.date_from, 'DD/MM') || ' s/d ' || to_char(NEW.date_to, 'DD/MM') || ').',
        '/guru/kelas'
      );
    END IF;

  -- 3.2 PADA SAAT PERUBAHAN STATUS (AFTER UPDATE)
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN

    -- A. Status disetujui (approved)
    IF NEW.status = 'approved' THEN
      v_att_status := CASE WHEN NEW.type = 'sick' THEN 'sick'::attendance_status ELSE 'excused'::attendance_status END;

      -- Upsert kehadiran untuk setiap hari kerja (Senin-Jumat) dalam rentang izin
      v_cur_date := NEW.date_from;
      WHILE v_cur_date <= NEW.date_to LOOP
        -- EXTRACT(ISODOW): 1=Senin .. 5=Jumat, 6=Sabtu, 7=Minggu
        IF EXTRACT(ISODOW FROM v_cur_date) BETWEEN 1 AND 5 THEN
          INSERT INTO attendance (class_id, student_id, date, status, note, recorded_by, created_at, updated_at)
          VALUES (
            v_class_id,
            NEW.student_id,
            v_cur_date,
            v_att_status,
            'Izin disetujui',
            COALESCE(NEW.reviewed_by, NEW.submitted_by),
            now(),
            now()
          )
          ON CONFLICT (student_id, class_id, date)
          DO UPDATE SET
            status = EXCLUDED.status,
            note = EXCLUDED.note,
            recorded_by = EXCLUDED.recorded_by,
            updated_at = now()
          -- PENTING: Jangan menimpa jika murid ternyata sudah tercatat hadir (present)
          WHERE attendance.status <> 'present';
        END IF;

        v_cur_date := v_cur_date + interval '1 day';
      END LOOP;

      -- Notifikasi ke pengaju
      PERFORM create_notification(
        NEW.submitted_by,
        'leave',
        'Izin Disetujui',
        'Izin ' || v_student_name || ' telah disetujui.',
        '/ortu/perkembangan'
      );

      -- Notifikasi ke semua orang tua jika pengaju bukan ortu tsb
      FOR v_parent IN
        SELECT parent_id FROM parent_students WHERE student_id = NEW.student_id AND parent_id <> NEW.submitted_by
      LOOP
        PERFORM create_notification(
          v_parent.parent_id,
          'leave',
          'Izin Disetujui',
          'Izin ' || v_student_name || ' telah disetujui oleh wali kelas.',
          '/ortu/perkembangan'
        );
      END LOOP;

    -- B. Status ditolak (rejected)
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        NEW.submitted_by,
        'leave',
        'Izin Ditolak',
        'Izin ' || v_student_name || ' ditolak.' || CASE WHEN NEW.review_note IS NOT NULL AND NEW.review_note <> '' THEN ' Catatan: ' || NEW.review_note ELSE '' END,
        '/ortu/perkembangan'
      );
    END IF;

  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leave_request_automation ON leave_requests;
CREATE TRIGGER trg_leave_request_automation
AFTER INSERT OR UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.trg_leave_request_automation();

-- --------------------------------------------------------------------
-- 4. TRIGGER NOTIFIKASI TUGAS BARU (assignments)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_assignment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id uuid;
  v_subject_name text;
  v_deadline_str text;
  v_student RECORD;
  v_parent RECORD;
BEGIN
  -- Dapatkan class_id dan nama mata pelajaran
  SELECT t.class_id, s.name INTO v_class_id, v_subject_name
  FROM teachings t
  JOIN subjects s ON s.id = t.subject_id
  WHERE t.id = NEW.teaching_id;

  v_subject_name := COALESCE(v_subject_name, 'Mata Pelajaran');
  v_deadline_str := to_char(NEW.deadline AT TIME ZONE 'Asia/Jakarta', 'DD/MM/YYYY HH24:MI') || ' WIB';

  -- Kirim ke setiap murid di kelas tugas tsb
  FOR v_student IN
    SELECT sc.student_id, p.full_name
    FROM student_classes sc
    JOIN profiles p ON p.id = sc.student_id
    WHERE sc.class_id = v_class_id AND p.is_active = true
  LOOP
    -- Notifikasi murid
    PERFORM create_notification(
      v_student.student_id,
      'assignment',
      'Tugas Baru: ' || v_subject_name,
      'Tugas baru ' || v_subject_name || ': ' || NEW.title || ', deadline ' || v_deadline_str || '.',
      '/murid/tugas'
    );

    -- Notifikasi ke seluruh orang tua murid tsb
    FOR v_parent IN
      SELECT parent_id FROM parent_students WHERE student_id = v_student.student_id
    LOOP
      PERFORM create_notification(
        v_parent.parent_id,
        'assignment',
        'Tugas Baru: ' || v_student.full_name,
        'Tugas baru ' || v_subject_name || ' untuk ' || v_student.full_name || ': ' || NEW.title || ', deadline ' || v_deadline_str || '.',
        '/ortu/perkembangan'
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assignment_notification ON assignments;
CREATE TRIGGER trg_assignment_notification
AFTER INSERT ON assignments
FOR EACH ROW
EXECUTE FUNCTION public.trg_assignment_notification();

-- --------------------------------------------------------------------
-- 5. TRIGGER NOTIFIKASI PENILAIAN TUGAS (submissions)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_submission_graded_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_title text;
  v_student_name text;
  v_parent RECORD;
BEGIN
  -- Hanya picu jika score baru diisi atau diubah nilainya
  IF NEW.score IS NOT NULL AND (OLD.score IS NULL OR OLD.score <> NEW.score) THEN
    SELECT a.title INTO v_assignment_title
    FROM assignments a WHERE a.id = NEW.assignment_id;

    SELECT p.full_name INTO v_student_name
    FROM profiles p WHERE p.id = NEW.student_id;

    v_assignment_title := COALESCE(v_assignment_title, 'Tugas');
    v_student_name := COALESCE(v_student_name, 'Murid');

    -- Notifikasi ke murid
    PERFORM create_notification(
      NEW.student_id,
      'grade',
      'Nilai Tugas: ' || v_assignment_title,
      'Tugas ' || v_assignment_title || ' sudah dinilai: ' || NEW.score,
      '/murid/tugas'
    );

    -- Notifikasi ke seluruh orang tua murid
    FOR v_parent IN
      SELECT parent_id FROM parent_students WHERE student_id = NEW.student_id
    LOOP
      PERFORM create_notification(
        v_parent.parent_id,
        'grade',
        'Nilai Tugas: ' || v_student_name,
        'Tugas ' || v_assignment_title || ' untuk ' || v_student_name || ' sudah dinilai: ' || NEW.score,
        '/ortu/perkembangan'
      );
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_submission_graded_notification ON submissions;
CREATE TRIGGER trg_submission_graded_notification
AFTER UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION public.trg_submission_graded_notification();

-- --------------------------------------------------------------------
-- 6. TRIGGER NOTIFIKASI PESAN & PEMBARUAN STATUS THREAD (messages)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_message_notification_and_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_sender_role user_role;
  v_thread_subject text;
  v_thread_status thread_status;
  v_participant RECORD;
BEGIN
  -- Dapatkan info pengirim dan thread
  SELECT full_name, role INTO v_sender_name, v_sender_role FROM profiles WHERE id = NEW.sender_id;
  SELECT subject, status INTO v_thread_subject, v_thread_status FROM threads WHERE id = NEW.thread_id;

  v_sender_name := COALESCE(v_sender_name, 'Pengguna');
  v_thread_subject := COALESCE(v_thread_subject, 'Percakapan');

  -- 1. Kirim notifikasi ke peserta thread LAIN (privasi: TANPA isi pesan)
  FOR v_participant IN
    SELECT user_id FROM thread_participants
    WHERE thread_id = NEW.thread_id AND user_id <> NEW.sender_id
  LOOP
    PERFORM create_notification(
      v_participant.user_id,
      'message',
      'Pesan baru dari ' || v_sender_name,
      'Pesan baru dari ' || v_sender_name || ': ' || v_thread_subject,
      '/pesan/' || NEW.thread_id
    );
  END LOOP;

  -- 2. Update status thread sesuai aturan bisnis:
  -- - Jika guru membalas dan status saat ini 'new'/'read' -> ubah jadi 'replied'
  -- - Jika non-guru mengirim dan status 'replied' -> ubah kembali ke 'new'
  -- - Jika status 'done', ada pesan baru membatalkan done -> kembali ke 'new'
  IF v_thread_status = 'done' THEN
    UPDATE threads SET status = 'new', updated_at = now() WHERE id = NEW.thread_id;
  ELSIF v_sender_role = 'teacher' AND v_thread_status IN ('new', 'read') THEN
    UPDATE threads SET status = 'replied', updated_at = now() WHERE id = NEW.thread_id;
  ELSIF v_sender_role <> 'teacher' AND v_thread_status = 'replied' THEN
    UPDATE threads SET status = 'new', updated_at = now() WHERE id = NEW.thread_id;
  ELSE
    UPDATE threads SET updated_at = now() WHERE id = NEW.thread_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_notification_and_status ON messages;
CREATE TRIGGER trg_message_notification_and_status
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION public.trg_message_notification_and_status();

-- Sesuaikan mark_thread_read agar mengubah status 'new' ke 'read' saat dibuka non-pembuat
CREATE OR REPLACE FUNCTION public.mark_thread_read(
  p_thread_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_creator_id uuid;
  v_status thread_status;
BEGIN
  v_user_id := p_user_id;
  IF v_user_id IS NULL THEN
    v_user_id := current_profile_id();
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak dapat diidentifikasi';
  END IF;

  -- Perbarui last_read_at
  UPDATE thread_participants
  SET last_read_at = now()
  WHERE thread_id = p_thread_id AND user_id = v_user_id;

  -- Update status thread: jika status masih 'new' dan dibuka oleh peserta non-pembuat -> ubah jadi 'read'
  SELECT created_by, status INTO v_creator_id, v_status FROM threads WHERE id = p_thread_id;
  IF v_status = 'new' AND v_user_id <> v_creator_id THEN
    UPDATE threads SET status = 'read', updated_at = now() WHERE id = p_thread_id;
  END IF;
END;
$$;

-- --------------------------------------------------------------------
-- 7. TRIGGER NOTIFIKASI PENGUMUMAN MASSAL (announcements)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_announcement_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snippet text;
BEGIN
  v_snippet := left(NEW.body, 80);

  -- Target 'all': seluruh user aktif selain penulis
  IF NEW.target = 'all' THEN
    INSERT INTO notifications (user_id, type, title, body, link, is_read, created_at)
    SELECT
      id,
      'announcement',
      'Pengumuman: ' || NEW.title,
      v_snippet,
      '/pengumuman',
      false,
      now()
    FROM profiles
    WHERE is_active = true AND id <> NEW.author_id;

  -- Target 'class': murid kelas tsb, ortu mereka, dan guru pengajar kelas tsb
  ELSIF NEW.target = 'class' AND NEW.class_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link, is_read, created_at)
    SELECT DISTINCT u.id, 'announcement', 'Pengumuman: ' || NEW.title, v_snippet, '/pengumuman', false, now()
    FROM (
      -- Murid kelas tsb
      SELECT sc.student_id AS id FROM student_classes sc WHERE sc.class_id = NEW.class_id
      UNION
      -- Ortu dari murid kelas tsb
      SELECT ps.parent_id AS id FROM student_classes sc JOIN parent_students ps ON ps.student_id = sc.student_id WHERE sc.class_id = NEW.class_id
      UNION
      -- Guru pengajar kelas tsb
      SELECT t.teacher_id AS id FROM teachings t WHERE t.class_id = NEW.class_id
      UNION
      -- Wali kelas tsb
      SELECT c.homeroom_teacher_id AS id FROM classes c WHERE c.id = NEW.class_id AND c.homeroom_teacher_id IS NOT NULL
    ) u
    JOIN profiles p ON p.id = u.id
    WHERE p.is_active = true AND u.id <> NEW.author_id;

  -- Target 'parents': seluruh orang tua aktif selain penulis
  ELSIF NEW.target = 'parents' THEN
    INSERT INTO notifications (user_id, type, title, body, link, is_read, created_at)
    SELECT
      id,
      'announcement',
      'Pengumuman: ' || NEW.title,
      v_snippet,
      '/pengumuman',
      false,
      now()
    FROM profiles
    WHERE role = 'parent' AND is_active = true AND id <> NEW.author_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_announcement_notification ON announcements;
CREATE TRIGGER trg_announcement_notification
AFTER INSERT ON announcements
FOR EACH ROW
EXECUTE FUNCTION public.trg_announcement_notification();

-- --------------------------------------------------------------------
-- 8. PENGINGAT DEADLINE TUGAS (CRON JOB HELPER)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignment_reminders (
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, student_id)
);

ALTER TABLE public.assignment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignment_reminders_admin" ON public.assignment_reminders TO authenticated USING (is_admin());

CREATE OR REPLACE FUNCTION public.notify_due_soon()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_count integer := 0;
  v_deadline_str text;
BEGIN
  -- Cari assignment dengan deadline 24 jam ke depan
  FOR v_rec IN
    SELECT
      a.id AS assignment_id,
      a.title,
      a.deadline,
      sc.student_id
    FROM assignments a
    JOIN teachings t ON t.id = a.teaching_id
    JOIN student_classes sc ON sc.class_id = t.class_id
    WHERE a.deadline > now()
      AND a.deadline <= (now() + interval '24 hours')
      -- Belum submit
      AND NOT EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.assignment_id = a.id AND s.student_id = sc.student_id
      )
      -- Belum pernah diingatkan
      AND NOT EXISTS (
        SELECT 1 FROM assignment_reminders ar
        WHERE ar.assignment_id = a.id AND ar.student_id = sc.student_id
      )
  LOOP
    -- Tandai pengingat sudah dikirim
    INSERT INTO assignment_reminders (assignment_id, student_id, reminded_at)
    VALUES (v_rec.assignment_id, v_rec.student_id, now())
    ON CONFLICT (assignment_id, student_id) DO NOTHING;

    v_deadline_str := to_char(v_rec.deadline AT TIME ZONE 'Asia/Jakarta', 'DD/MM/YYYY HH24:MI') || ' WIB';

    PERFORM create_notification(
      v_rec.student_id,
      'reminder',
      'Pengingat Deadline Tugas',
      'Tugas ' || v_rec.title || ' akan berakhir dalam 24 jam (' || v_deadline_str || '). Segera kumpulkan!',
      '/murid/tugas'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- --------------------------------------------------------------------
-- 9. BERSIH-BERSIH NOTIFIKASI LAMA (60 HARI)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_old_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
    AND created_at < (now() - interval '60 days');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
