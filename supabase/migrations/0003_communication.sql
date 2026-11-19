-- ====================================================================
-- MIGRATION: 0003_communication.sql
-- DESKRIPSI: Tabel pengumuman (announcements), pembacaan (reads),
--             pesan & chat thread (threads, participants, messages),
--             serta sistem notifikasi & pengingat ortu ke murid.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ENUMS
-- --------------------------------------------------------------------
CREATE TYPE announcement_target AS ENUM ('all', 'class', 'parents');
CREATE TYPE thread_category AS ENUM ('leave', 'consultation', 'assignment', 'other');
CREATE TYPE thread_status AS ENUM ('new', 'read', 'replied', 'done');
CREATE TYPE notification_type AS ENUM (
  'attendance',
  'leave',
  'assignment',
  'grade',
  'message',
  'announcement',
  'reminder'
);

-- --------------------------------------------------------------------
-- 2. TABEL: announcements (Pengumuman Sekolah)
-- --------------------------------------------------------------------
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target announcement_target NOT NULL,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- class_id wajib terisi JIKA target = 'class', dan harus NULL untuk target lainnya
  CONSTRAINT chk_announcements_class_target CHECK (
    (target = 'class' AND class_id IS NOT NULL) OR
    (target <> 'class' AND class_id IS NULL)
  )
);

COMMENT ON TABLE announcements IS 'Pengumuman sekolah untuk umum, kelas tertentu, atau seluruh orang tua';

-- Trigger validasi pembuat pengumuman:
-- 1. author_id harus ber-role 'teacher' atau 'admin'
-- 2. Target 'all' HANYA boleh dibuat oleh admin
-- 3. Jika guru membuat target 'class', guru tsb harus mengajar di kelas tsb (teachings) atau wali kelas (classes)
CREATE OR REPLACE FUNCTION validate_announcement()
RETURNS TRIGGER AS $$
DECLARE
  v_author_role user_role;
BEGIN
  SELECT role INTO v_author_role FROM profiles WHERE id = NEW.author_id;

  IF v_author_role IS NULL OR v_author_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'author_id (%) harus ber-role teacher atau admin', NEW.author_id;
  END IF;

  -- Hanya admin yang boleh target 'all'
  IF NEW.target = 'all' AND v_author_role <> 'admin' THEN
    RAISE EXCEPTION 'Hanya admin yang diizinkan membuat pengumuman dengan target all';
  END IF;

  -- Guru yang target 'class' harus mengajar atau menjadi wali kelas di kelas tersebut
  IF v_author_role = 'teacher' AND NEW.target = 'class' THEN
    IF NOT EXISTS (
      SELECT 1 FROM teachings WHERE teacher_id = NEW.author_id AND class_id = NEW.class_id
      UNION
      SELECT 1 FROM classes WHERE id = NEW.class_id AND homeroom_teacher_id = NEW.author_id
    ) THEN
      RAISE EXCEPTION 'Guru (%) tidak mengajar atau menjadi wali kelas di class_id (%)', NEW.author_id, NEW.class_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_announcement
BEFORE INSERT OR UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION validate_announcement();

-- --------------------------------------------------------------------
-- 3. TABEL: announcement_reads (Status Sudah Dibaca)
-- --------------------------------------------------------------------
CREATE TABLE announcement_reads (
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (announcement_id, user_id)
);

COMMENT ON TABLE announcement_reads IS 'Pencatatan user yang telah membaca pengumuman';

-- --------------------------------------------------------------------
-- 4. TABEL: threads (Utas Pesan / Diskusi)
-- --------------------------------------------------------------------
CREATE TABLE threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category thread_category NOT NULL,
  subject text NOT NULL,
  status thread_status NOT NULL DEFAULT 'new',
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE threads IS 'Utas percakapan terstruktur (guru-ortu atau guru-murid)';
COMMENT ON COLUMN threads.student_id IS 'Murid yang menjadi topik konsultasi/izin (wajib ada pada thread guru-ortu)';

-- Trigger validasi pembuatan thread:
-- 1. Admin tidak boleh membuat thread
-- 2. Jika dibuat oleh orang tua, student_id wajib diisi dan tertaut di parent_students
CREATE OR REPLACE FUNCTION validate_thread_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_role user_role;
BEGIN
  SELECT role INTO v_creator_role FROM profiles WHERE id = NEW.created_by;

  IF v_creator_role IS NULL THEN
    RAISE EXCEPTION 'created_by (%) tidak ditemukan', NEW.created_by;
  END IF;

  IF v_creator_role = 'admin' THEN
    RAISE EXCEPTION 'Admin tidak diizinkan membuat atau terlibat dalam thread pesan';
  END IF;

  -- Jika pembuat adalah orang tua, wajib cantumkan student_id anaknya
  IF v_creator_role = 'parent' THEN
    IF NEW.student_id IS NULL THEN
      RAISE EXCEPTION 'Thread yang dibuat orang tua wajib menyertakan student_id anak';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM parent_students
      WHERE parent_id = NEW.created_by AND student_id = NEW.student_id
    ) THEN
      RAISE EXCEPTION 'Orang tua (%) tidak tertaut dengan murid (%)', NEW.created_by, NEW.student_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_thread_creation
BEFORE INSERT OR UPDATE ON threads
FOR EACH ROW
EXECUTE FUNCTION validate_thread_creation();

-- Otomatis menambahkan pembuat thread ke thread_participants
CREATE OR REPLACE FUNCTION trg_add_thread_creator_participant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO thread_participants (thread_id, user_id, last_read_at)
  VALUES (NEW.id, NEW.created_by, now())
  ON CONFLICT (thread_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------
-- 5. TABEL: thread_participants (Peserta Utas Pesan)
-- --------------------------------------------------------------------
CREATE TABLE thread_participants (
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz,

  PRIMARY KEY (thread_id, user_id)
);

COMMENT ON TABLE thread_participants IS 'Daftar partisipan aktif pada suatu utas percakapan';

-- Daftarkan trigger penambahan pembuat thread setelah tabel thread_participants terdefinisi
CREATE TRIGGER trg_after_thread_insert_add_creator
AFTER INSERT ON threads
FOR EACH ROW
EXECUTE FUNCTION trg_add_thread_creator_participant();

-- Trigger validasi PRIVASI thread_participants:
-- 1. Admin dilarang keras menjadi peserta thread
-- 2. Dalam 1 thread TIDAK BOLEH memuat orang tua dan murid sekaligus
-- 3. Kombinasi yang sah hanya guru+ortu atau guru+murid
-- 4. Untuk thread yang memiliki student_id, ortu yang bergabung harus tertaut di parent_students
CREATE OR REPLACE FUNCTION validate_thread_participant()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_thread_student_id uuid;
  v_has_parent boolean;
  v_has_student boolean;
BEGIN
  -- Ambil role user yang hendak didaftarkan
  SELECT role INTO v_role FROM profiles WHERE id = NEW.user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User (%) tidak ditemukan', NEW.user_id;
  END IF;

  -- Admin tidak boleh ikut serta dalam thread pesan
  IF v_role = 'admin' THEN
    RAISE EXCEPTION 'Admin tidak diizinkan menjadi peserta thread pesan';
  END IF;

  -- Ambil metadata thread (student_id topik jika ada)
  SELECT student_id INTO v_thread_student_id FROM threads WHERE id = NEW.thread_id;

  -- Cek komposisi peserta thread saat ini
  SELECT
    EXISTS (
      SELECT 1 FROM thread_participants tp
      JOIN profiles p ON p.id = tp.user_id
      WHERE tp.thread_id = NEW.thread_id AND p.role = 'parent' AND tp.user_id <> NEW.user_id
    ),
    EXISTS (
      SELECT 1 FROM thread_participants tp
      JOIN profiles p ON p.id = tp.user_id
      WHERE tp.thread_id = NEW.thread_id AND p.role = 'student' AND tp.user_id <> NEW.user_id
    )
  INTO v_has_parent, v_has_student;

  -- Aturan Privasi 1: Jika user yang masuk adalah 'parent', tidak boleh ada 'student' di thread
  IF v_role = 'parent' THEN
    IF v_has_student THEN
      RAISE EXCEPTION 'Privasi dilanggar: Thread tidak boleh memuat orang tua dan murid sekaligus';
    END IF;

    -- Validasi relasi ortu ke murid topik
    IF v_thread_student_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM parent_students
        WHERE parent_id = NEW.user_id AND student_id = v_thread_student_id
      ) THEN
        RAISE EXCEPTION 'Orang tua (%) tidak tertaut dengan murid topik (%) pada thread ini', NEW.user_id, v_thread_student_id;
      END IF;
    END IF;
  END IF;

  -- Aturan Privasi 2: Jika user yang masuk adalah 'student', tidak boleh ada 'parent' di thread
  IF v_role = 'student' THEN
    IF v_has_parent THEN
      RAISE EXCEPTION 'Privasi dilanggar: Thread tidak boleh memuat orang tua dan murid sekaligus';
    END IF;

    -- Jika thread memiliki student_id spesifik, murid harus cocok
    IF v_thread_student_id IS NOT NULL AND NEW.user_id <> v_thread_student_id THEN
      RAISE EXCEPTION 'Murid (%) tidak cocok dengan student_id thread (%)', NEW.user_id, v_thread_student_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_thread_participant
BEFORE INSERT OR UPDATE ON thread_participants
FOR EACH ROW
EXECUTE FUNCTION validate_thread_participant();

-- --------------------------------------------------------------------
-- 6. TABEL: messages (Pesan Chat dalam Thread)
-- Tidak ada fitur edit/hapus pesan (immutable history).
-- --------------------------------------------------------------------
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  attachment_path text,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Panjang pesan 1 s/d 2000 karakter setelah trim
  CONSTRAINT chk_messages_body_length CHECK (char_length(trim(body)) BETWEEN 1 AND 2000)
);

COMMENT ON TABLE messages IS 'Pesan chat dalam thread (riwayat pesan permanen, tanpa edit/hapus)';

-- Trigger validasi pesan:
-- 1. Pengirim harus terdaftar sebagai peserta thread
-- 2. Setiap pesan baru meng-update threads.updated_at
CREATE OR REPLACE FUNCTION validate_message_and_update_thread()
RETURNS TRIGGER AS $$
BEGIN
  -- Pastikan pengirim adalah peserta thread
  IF NOT EXISTS (
    SELECT 1 FROM thread_participants
    WHERE thread_id = NEW.thread_id AND user_id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'Pengirim (%) bukan peserta dalam thread (%)', NEW.sender_id, NEW.thread_id;
  END IF;

  -- Update timestamp thread
  UPDATE threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_message_and_update_thread
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION validate_message_and_update_thread();

-- --------------------------------------------------------------------
-- 7. TABEL: notifications (Pemberitahuan Akun)
-- --------------------------------------------------------------------
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE notifications IS 'Notifikasi dalam aplikasi (in-app notifications)';

-- Index khusus untuk query daftar notifikasi dan penghitungan badge lonceng
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- --------------------------------------------------------------------
-- 8. FUNGSI SQL (SECURITY DEFINER DENGAN SEARCH_PATH TERKUNCI)
-- --------------------------------------------------------------------

-- 8.1 create_notification: helper insert notifikasi
CREATE OR REPLACE FUNCTION create_notification(
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
  INSERT INTO notifications (user_id, type, title, body, link, is_read, created_at)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, false, now())
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION create_notification IS 'Fungsi pembantu membuat notifikasi pengguna baru (SECURITY DEFINER)';

-- 8.2 send_parent_reminder: pesan pengingat ortu ke murid (maks 5x per hari)
-- Parameter p_caller_id opsional untuk mempermudah testing di SQL Editor
CREATE OR REPLACE FUNCTION send_parent_reminder(
  p_student_id uuid,
  p_text text,
  p_caller_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
  v_trimmed text;
  v_today_start timestamptz;
  v_count integer;
  v_notification_id uuid;
BEGIN
  -- Tentukan ID profil ortu dari parameter atau dari session auth.uid()
  v_parent_id := p_caller_id;
  IF v_parent_id IS NULL THEN
    SELECT id INTO v_parent_id
    FROM profiles
    WHERE auth_user_id = auth.uid() AND role = 'parent'
    LIMIT 1;
  END IF;

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Hanya akun orang tua terdaftar yang dapat mengirimkan pengingat';
  END IF;

  -- Pastikan role pengirim adalah parent
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_parent_id AND role = 'parent') THEN
    RAISE EXCEPTION 'Pengirim (%) bukan profil ber-role parent', v_parent_id;
  END IF;

  -- Pastikan murid tertaut dengan orang tua tsb
  IF NOT EXISTS (
    SELECT 1 FROM parent_students
    WHERE parent_id = v_parent_id AND student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'Orang tua (%) tidak memiliki relasi tertaut dengan murid (%)', v_parent_id, p_student_id;
  END IF;

  -- Validasi panjang teks 1-200 karakter
  v_trimmed := trim(p_text);
  IF char_length(v_trimmed) < 1 OR char_length(v_trimmed) > 200 THEN
    RAISE EXCEPTION 'Isi pengingat harus antara 1 sampai 200 karakter';
  END IF;

  -- Batasi maksimal 5 pengingat per anak per hari (WIB: Asia/Jakarta)
  v_today_start := (date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta')) AT TIME ZONE 'Asia/Jakarta';

  SELECT count(*) INTO v_count
  FROM notifications
  WHERE user_id = p_student_id
    AND type = 'reminder'
    AND created_at >= v_today_start;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Batas maksimal 5 pengingat per hari untuk anak ini telah tercapai (sudah % pengingat)', v_count;
  END IF;

  -- Kirim notifikasi bertipe 'reminder'
  INSERT INTO notifications (user_id, type, title, body, link, is_read)
  VALUES (
    p_student_id,
    'reminder',
    'Pengingat dari Orang Tua',
    v_trimmed,
    NULL,
    false
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION send_parent_reminder IS 'Mengirim pengingat dari ortu ke murid (maksimal 5x sehari)';

-- 8.3 mark_thread_read: tandai thread sudah dibaca
CREATE OR REPLACE FUNCTION mark_thread_read(
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
BEGIN
  v_user_id := p_user_id;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak dapat diidentifikasi';
  END IF;

  UPDATE thread_participants
  SET last_read_at = now()
  WHERE thread_id = p_thread_id AND user_id = v_user_id;
END;
$$;

COMMENT ON FUNCTION mark_thread_read IS 'Memperbarui timestamp last_read_at peserta thread ke waktu sekarang';

-- 8.4 unread_count: hitung pesan belum dibaca dalam thread untuk user tertentu
CREATE OR REPLACE FUNCTION unread_count(
  p_thread_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_last_read_at timestamptz;
  v_unread integer;
BEGIN
  v_user_id := p_user_id;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT last_read_at INTO v_last_read_at
  FROM thread_participants
  WHERE thread_id = p_thread_id AND user_id = v_user_id;

  SELECT count(*) INTO v_unread
  FROM messages
  WHERE thread_id = p_thread_id
    AND sender_id <> v_user_id
    AND (v_last_read_at IS NULL OR created_at > v_last_read_at);

  RETURN COALESCE(v_unread, 0);
END;
$$;

COMMENT ON FUNCTION unread_count IS 'Menghitung jumlah pesan baru yang belum dibaca pengguna dalam thread';

-- --------------------------------------------------------------------
-- 9. SUPABASE REALTIME (IDEMPOTENT)
-- Aktifkan realtime pada tabel notifications dan messages jika publikasi ada
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
  END IF;
END $$;

-- --------------------------------------------------------------------
-- 10. INDEXES TAMBAHAN
-- --------------------------------------------------------------------
CREATE INDEX idx_announcements_target_class ON announcements(target, class_id);
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_threads_student_id ON threads(student_id);
CREATE INDEX idx_threads_created_by ON threads(created_by);
CREATE INDEX idx_threads_updated_at ON threads(updated_at DESC);
CREATE INDEX idx_messages_thread_created ON messages(thread_id, created_at ASC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
