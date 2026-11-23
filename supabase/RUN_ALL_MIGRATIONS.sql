-- >>> FILE: 0001_foundation.sql >>>
-- ====================================================================
-- MIGRATION: 0001_foundation.sql
-- DESKRIPSI: Fondasi database Sekolahku (Enums, Fungsi Normalisasi, 
--             Tabel Profil & Master Data, Relasi, Trigger Validasi Role,
--             dan Indexes).
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ENUM: Role Pengguna
-- --------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'parent');

-- --------------------------------------------------------------------
-- 2. FUNGSI: Normalisasi Email Gmail
-- Membersihkan spasi, lowercase, menghapus titik di local-part,
-- dan membuang suffix "+tag" agar luqman+tes@gmail.com = luqman@gmail.com
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_gmail(email text)
RETURNS text
IMMUTABLE
LANGUAGE plpgsql
AS $$
DECLARE
  v_email text;
  v_local text;
  v_domain text;
BEGIN
  IF email IS NULL THEN
    RETURN NULL;
  END IF;

  v_email := lower(trim(email));
  v_local := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);

  -- Jika domain gmail.com, terapkan aturan spesifik Gmail
  IF v_domain = 'gmail.com' THEN
    -- Buang suffix '+tag' jika ada
    v_local := regexp_replace(v_local, '\+.*$', '');
    -- Hapus semua tanda titik di local-part
    v_local := replace(v_local, '.', '');
    RETURN v_local || '@' || v_domain;
  END IF;

  -- Domain non-gmail (misal akun demo) tetap di-lower dan di-trim
  RETURN v_email;
END;
$$;

COMMENT ON FUNCTION normalize_gmail(text) IS 'Menormalisasi email Gmail: lowercase, trim, hapus titik dan suffix +tag pada local part';

-- --------------------------------------------------------------------
-- 3. TABEL: profiles
-- Menyimpan informasi pengguna Sekolahku. auth_user_id dihubungkan ke
-- auth.users saat pengguna pertama kali login dengan Google.
-- --------------------------------------------------------------------
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  email text NOT NULL,
  email_normalized text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role user_role NOT NULL,
  phone text,
  is_homeroom boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Email tidak boleh mengandung karakter spasi
  CONSTRAINT chk_profiles_email_no_space CHECK (email NOT LIKE '% %'),

  -- Akun non-demo wajib berakhiran @gmail.com. Akun demo memakai domain @demo.sekolahku.test
  CONSTRAINT chk_profiles_email_domain CHECK (
    (email LIKE '%@gmail.com') OR 
    (is_demo = true AND email LIKE '%@demo.sekolahku.test')
  )
);

COMMENT ON TABLE profiles IS 'Profil pengguna Sekolahku (admin, teacher, student, parent)';
COMMENT ON COLUMN profiles.auth_user_id IS 'Tautan ke auth.users Supabase saat login pertama kali';
COMMENT ON COLUMN profiles.email_normalized IS 'Email hasil normalisasi untuk pencegahan duplikasi trik Gmail';
COMMENT ON COLUMN profiles.is_homeroom IS 'Penanda guru yang ditugaskan sebagai wali kelas';

-- Trigger otomatis mengisi email_normalized sebelum insert/update
CREATE OR REPLACE FUNCTION trg_set_profile_email_normalized()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := trim(NEW.email);
  NEW.email_normalized := normalize_gmail(NEW.email);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_email_normalized
BEFORE INSERT OR UPDATE OF email ON profiles
FOR EACH ROW
EXECUTE FUNCTION trg_set_profile_email_normalized();

-- --------------------------------------------------------------------
-- 4. TABEL MASTER & RELASI
-- --------------------------------------------------------------------

-- 4.1 Tabel classes (Kelas)
CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  academic_year text NOT NULL,
  homeroom_teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_classes_name_academic_year UNIQUE (name, academic_year)
);

COMMENT ON TABLE classes IS 'Daftar kelas per tahun ajaran (contoh: X RPL 1, 2024/2025)';

-- 4.2 Tabel subjects (Mata Pelajaran)
CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE subjects IS 'Daftar mata pelajaran SMK';

-- 4.3 Tabel student_classes (Anggota Kelas)
-- Murid dibatasi satu kelas aktif (unique student_id untuk simplisitas)
CREATE TABLE student_classes (
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (student_id, class_id),
  CONSTRAINT uq_student_classes_student UNIQUE (student_id)
);

COMMENT ON TABLE student_classes IS 'Relasi penempatan murid ke kelas (1 murid 1 kelas)';

-- 4.4 Tabel parent_students (Hubungan Orang Tua & Murid)
CREATE TABLE parent_students (
  parent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (parent_id, student_id)
);

COMMENT ON TABLE parent_students IS 'Relasi orang tua / wali dengan anak/murid';

-- 4.5 Tabel teachings (Penugasan Guru Mengajar Mapel di Kelas)
CREATE TABLE teachings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_teachings_teacher_subject_class UNIQUE (teacher_id, subject_id, class_id)
);

COMMENT ON TABLE teachings IS 'Penugasan guru mengajar mata pelajaran pada kelas tertentu';

-- 4.6 Tabel schedules (Jadwal Pelajaran)
CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_id uuid NOT NULL REFERENCES teachings(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_schedules_day_of_week CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_schedules_time_order CHECK (end_time > start_time)
);

COMMENT ON TABLE schedules IS 'Jadwal sesi mengajar harian (1=Senin s/d 7=Minggu)';

-- --------------------------------------------------------------------
-- 5. TRIGGER VALIDASI ROLE
-- Catatan Arsitektur:
-- Mengapa menggunakan trigger BEFORE INSERT/UPDATE dan bukan CHECK CONSTRAINT?
-- PostgreSQL TIDAK mengizinkan subquery di dalam CHECK constraint tabel
-- (akan menghasilkan error: "cannot use subquery in check constraint").
-- Oleh karena itu, trigger validasi prosedural adalah mekanisme resmi, aman,
-- dan paling reliable di PostgreSQL untuk memvalidasi role foreign table.
-- --------------------------------------------------------------------

-- 5.1 Validasi parent_students: parent_id harus 'parent', student_id harus 'student'
CREATE OR REPLACE FUNCTION validate_parent_students_roles()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_role user_role;
  v_student_role user_role;
BEGIN
  SELECT role INTO v_parent_role FROM profiles WHERE id = NEW.parent_id;
  IF v_parent_role IS NULL OR v_parent_role <> 'parent' THEN
    RAISE EXCEPTION 'parent_id (%) harus merujuk ke profile dengan role parent (ditemukan: %)', NEW.parent_id, v_parent_role;
  END IF;

  SELECT role INTO v_student_role FROM profiles WHERE id = NEW.student_id;
  IF v_student_role IS NULL OR v_student_role <> 'student' THEN
    RAISE EXCEPTION 'student_id (%) harus merujuk ke profile dengan role student (ditemukan: %)', NEW.student_id, v_student_role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_parent_students_roles
BEFORE INSERT OR UPDATE ON parent_students
FOR EACH ROW
EXECUTE FUNCTION validate_parent_students_roles();

-- 5.2 Validasi student_classes: student_id harus 'student'
CREATE OR REPLACE FUNCTION validate_student_classes_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = NEW.student_id;
  IF v_role IS NULL OR v_role <> 'student' THEN
    RAISE EXCEPTION 'student_id (%) pada student_classes harus memiliki role student (ditemukan: %)', NEW.student_id, v_role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_student_classes_role
BEFORE INSERT OR UPDATE ON student_classes
FOR EACH ROW
EXECUTE FUNCTION validate_student_classes_role();

-- 5.3 Validasi teachings: teacher_id harus 'teacher'
CREATE OR REPLACE FUNCTION validate_teachings_teacher_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = NEW.teacher_id;
  IF v_role IS NULL OR v_role <> 'teacher' THEN
    RAISE EXCEPTION 'teacher_id (%) pada teachings harus memiliki role teacher (ditemukan: %)', NEW.teacher_id, v_role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_teachings_teacher_role
BEFORE INSERT OR UPDATE ON teachings
FOR EACH ROW
EXECUTE FUNCTION validate_teachings_teacher_role();

-- 5.4 Validasi classes: homeroom_teacher_id (jika diisi) harus 'teacher'
CREATE OR REPLACE FUNCTION validate_classes_homeroom_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  IF NEW.homeroom_teacher_id IS NOT NULL THEN
    SELECT role INTO v_role FROM profiles WHERE id = NEW.homeroom_teacher_id;
    IF v_role IS NULL OR v_role <> 'teacher' THEN
      RAISE EXCEPTION 'homeroom_teacher_id (%) harus memiliki role teacher (ditemukan: %)', NEW.homeroom_teacher_id, v_role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_classes_homeroom_role
BEFORE INSERT OR UPDATE ON classes
FOR EACH ROW
EXECUTE FUNCTION validate_classes_homeroom_role();

-- --------------------------------------------------------------------
-- 6. INDEXES
-- Index untuk performa join & filter foreign key
-- --------------------------------------------------------------------
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_profiles_email_normalized ON profiles(email_normalized);

CREATE INDEX idx_classes_homeroom_teacher_id ON classes(homeroom_teacher_id);
CREATE INDEX idx_student_classes_class_id ON student_classes(class_id);
CREATE INDEX idx_parent_students_student_id ON parent_students(student_id);

CREATE INDEX idx_teachings_teacher_id ON teachings(teacher_id);
CREATE INDEX idx_teachings_subject_id ON teachings(subject_id);
CREATE INDEX idx_teachings_class_id ON teachings(class_id);

CREATE INDEX idx_schedules_teaching_id ON schedules(teaching_id);
CREATE INDEX idx_schedules_day_of_week ON schedules(day_of_week);


-- >>> FILE: 0002_academic.sql >>>
-- ====================================================================
-- MIGRATION: 0002_academic.sql
-- DESKRIPSI: Tabel absensi, permohonan izin (leave requests), tugas
--             (assignments), pengumpulan tugas & nilai (submissions),
--             view status tugas per murid, fungsi bulk upsert absensi,
--             serta trigger validasi integritas data akademik.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ENUMS
-- --------------------------------------------------------------------
CREATE TYPE attendance_status AS ENUM ('present', 'sick', 'excused', 'absent');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE leave_type AS ENUM ('sick', 'excused');
CREATE TYPE submission_status AS ENUM ('submitted', 'graded');

-- --------------------------------------------------------------------
-- 2. TABEL: attendance (Absensi Murid Harian)
-- --------------------------------------------------------------------
CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date date NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  note text,
  recorded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Satu murid di satu kelas hanya punya 1 catatan absensi per tanggal
  CONSTRAINT uq_attendance_student_class_date UNIQUE (student_id, class_id, date)
);

COMMENT ON TABLE attendance IS 'Pencatatan absensi harian murid per kelas';
COMMENT ON COLUMN attendance.recorded_by IS 'Guru atau admin yang mencatat/mengubah absensi';

-- Trigger updated_at otomatis untuk attendance
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_attendance_updated_at
BEFORE UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

-- Trigger validasi:
-- 1. student_id harus ber-role 'student' dan terdaftar di class_id (lewat student_classes)
-- 2. recorded_by harus ber-role 'teacher' atau 'admin'
CREATE OR REPLACE FUNCTION validate_attendance_record()
RETURNS TRIGGER AS $$
DECLARE
  v_student_role user_role;
  v_recorder_role user_role;
BEGIN
  -- Validasi student role
  SELECT role INTO v_student_role FROM profiles WHERE id = NEW.student_id;
  IF v_student_role IS NULL OR v_student_role <> 'student' THEN
    RAISE EXCEPTION 'student_id (%) harus memiliki role student (ditemukan: %)', NEW.student_id, v_student_role;
  END IF;

  -- Validasi student terdaftar di kelas tsb
  IF NOT EXISTS (
    SELECT 1 FROM student_classes
    WHERE student_id = NEW.student_id AND class_id = NEW.class_id
  ) THEN
    RAISE EXCEPTION 'student_id (%) tidak terdaftar di class_id (%)', NEW.student_id, NEW.class_id;
  END IF;

  -- Validasi recorded_by role (teacher atau admin)
  SELECT role INTO v_recorder_role FROM profiles WHERE id = NEW.recorded_by;
  IF v_recorder_role IS NULL OR v_recorder_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'recorded_by (%) harus ber-role teacher atau admin (ditemukan: %)', NEW.recorded_by, v_recorder_role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_attendance_record
BEFORE INSERT OR UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION validate_attendance_record();

-- --------------------------------------------------------------------
-- 3. TABEL: leave_requests (Permohonan Izin / Sakit)
-- --------------------------------------------------------------------
CREATE TABLE leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date_from date NOT NULL,
  date_to date NOT NULL,
  reason text NOT NULL,
  attachment_path text,
  type leave_type NOT NULL,
  status leave_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_leave_requests_date_range CHECK (date_to >= date_from)
);

COMMENT ON TABLE leave_requests IS 'Pengajuan surat izin/sakit yang diajukan oleh ortu atau murid';

CREATE TRIGGER set_leave_requests_updated_at
BEFORE UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

-- Trigger validasi:
-- 1. submitted_by harus murid itu sendiri ATAU orang tua murid yang tertaut di parent_students
-- 2. student_id harus ber-role 'student'
-- 3. reviewed_by (jika diisi) harus ber-role 'teacher' atau 'admin'
CREATE OR REPLACE FUNCTION validate_leave_request()
RETURNS TRIGGER AS $$
DECLARE
  v_student_role user_role;
  v_reviewer_role user_role;
BEGIN
  -- Validasi role murid
  SELECT role INTO v_student_role FROM profiles WHERE id = NEW.student_id;
  IF v_student_role IS NULL OR v_student_role <> 'student' THEN
    RAISE EXCEPTION 'student_id (%) harus memiliki role student', NEW.student_id;
  END IF;

  -- Validasi pengaju: murid sendiri ATAU orang tua tertaut
  IF NEW.submitted_by <> NEW.student_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM parent_students
      WHERE parent_id = NEW.submitted_by AND student_id = NEW.student_id
    ) THEN
      RAISE EXCEPTION 'submitted_by (%) bukan murid ybs dan bukan orang tua yang tertaut di parent_students', NEW.submitted_by;
    END IF;
  END IF;

  -- Validasi reviewer (jika ada)
  IF NEW.reviewed_by IS NOT NULL THEN
    SELECT role INTO v_reviewer_role FROM profiles WHERE id = NEW.reviewed_by;
    IF v_reviewer_role IS NULL OR v_reviewer_role NOT IN ('teacher', 'admin') THEN
      RAISE EXCEPTION 'reviewed_by (%) harus ber-role teacher atau admin', NEW.reviewed_by;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_leave_request
BEFORE INSERT OR UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION validate_leave_request();

-- --------------------------------------------------------------------
-- 4. TABEL: assignments (Tugas Mata Pelajaran)
-- --------------------------------------------------------------------
CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_id uuid NOT NULL REFERENCES teachings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  deadline timestamptz NOT NULL,
  attachment_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE assignments IS 'Daftar tugas yang dibuat guru pada mata pelajaran dan kelas tertentu';
COMMENT ON COLUMN assignments.deadline IS 'Batas akhir pengumpulan disimpan dalam format UTC';

CREATE TRIGGER set_assignments_updated_at
BEFORE UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

-- --------------------------------------------------------------------
-- 5. TABEL: submissions (Pengumpulan Tugas & Penilaian)
-- --------------------------------------------------------------------
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_url text,
  file_path text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status submission_status NOT NULL DEFAULT 'submitted',
  score numeric(5, 2),
  feedback text,
  graded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Satu murid hanya punya 1 baris pengumpulan per tugas (pengumpulan ulang = UPDATE)
  CONSTRAINT uq_submissions_assignment_student UNIQUE (assignment_id, student_id),

  -- Nilai hanya boleh berada pada rentang 0 s/d 100
  CONSTRAINT chk_submissions_score_range CHECK (score IS NULL OR (score >= 0 AND score <= 100)),

  -- Minimal salah satu dari tautan (link) atau file yang diunggah harus terisi
  CONSTRAINT chk_submissions_content CHECK (content_url IS NOT NULL OR file_path IS NOT NULL)
);

COMMENT ON TABLE submissions IS 'Pengumpulan jawaban tugas oleh murid dan penilaian oleh guru';

CREATE TRIGGER set_submissions_updated_at
BEFORE UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

-- Trigger validasi submission:
-- 1. Murid harus terdaftar di kelas dari assignment yang bersangkutan
-- 2. graded_by (jika diisi) harus ber-role 'teacher' atau 'admin'
-- 3. Jika score diisi, status otomatis diubah ke 'graded'
CREATE OR REPLACE FUNCTION validate_submission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_class_id uuid;
  v_grader_role user_role;
BEGIN
  -- Ambil class_id dari assignment lewat relasi teachings
  SELECT t.class_id INTO v_class_id
  FROM assignments a
  JOIN teachings t ON t.id = a.teaching_id
  WHERE a.id = NEW.assignment_id;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Assignment (%) tidak valid atau kelas tidak ditemukan', NEW.assignment_id;
  END IF;

  -- Pastikan murid terdaftar di kelas tugas ini
  IF NOT EXISTS (
    SELECT 1 FROM student_classes
    WHERE student_id = NEW.student_id AND class_id = v_class_id
  ) THEN
    RAISE EXCEPTION 'student_id (%) tidak terdaftar di kelas untuk assignment (%)', NEW.student_id, NEW.assignment_id;
  END IF;

  -- Validasi grader jika ada penilaian
  IF NEW.graded_by IS NOT NULL THEN
    SELECT role INTO v_grader_role FROM profiles WHERE id = NEW.graded_by;
    IF v_grader_role IS NULL OR v_grader_role NOT IN ('teacher', 'admin') THEN
      RAISE EXCEPTION 'graded_by (%) harus ber-role teacher atau admin', NEW.graded_by;
    END IF;
  END IF;

  -- Jika nilai dimasukkan, set otomatis status menjadi graded dan catat graded_at jika belum ada
  IF NEW.score IS NOT NULL THEN
    NEW.status := 'graded';
    IF NEW.graded_at IS NULL THEN
      NEW.graded_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_submission_record
BEFORE INSERT OR UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION validate_submission_record();

-- --------------------------------------------------------------------
-- 6. VIEW: assignment_status_view
-- Menampilkan status pengumpulan tugas per murid per tugas dengan
-- 5 kemungkinan status turunan:
-- - 'graded': sudah dinilai
-- - 'late': dikumpulkan melewati batas deadline (belum dinilai)
-- - 'submitted': dikumpulkan tepat waktu (belum dinilai)
-- - 'overdue_not_submitted': belum dikumpulkan dan waktu sekarang sudah melewati deadline
-- - 'not_submitted': belum dikumpulkan dan masih dalam batas waktu deadline
-- security_invoker = true memastikan RLS tabel sumber diterapkan
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW assignment_status_view
WITH (security_invoker = true)
AS
SELECT
  a.id AS assignment_id,
  sc.student_id,
  t.class_id,
  a.title AS assignment_title,
  a.deadline,
  s.id AS submission_id,
  s.submitted_at,
  s.score,
  s.feedback,
  CASE
    -- 1. Jika sudah diberi nilai
    WHEN s.score IS NOT NULL OR s.status = 'graded' THEN 'graded'
    -- 2. Jika sudah dikumpul tapi telat
    WHEN s.id IS NOT NULL AND s.submitted_at > a.deadline THEN 'late'
    -- 3. Jika sudah dikumpul tepat waktu
    WHEN s.id IS NOT NULL THEN 'submitted'
    -- 4. Jika belum dikumpul dan sudah melewati deadline
    WHEN now() > a.deadline THEN 'overdue_not_submitted'
    -- 5. Jika belum dikumpul dan masih ada waktu
    ELSE 'not_submitted'
  END AS status
FROM assignments a
JOIN teachings t ON t.id = a.teaching_id
JOIN student_classes sc ON sc.class_id = t.class_id
LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = sc.student_id;

COMMENT ON VIEW assignment_status_view IS 'View status tugas per murid per tugas dengan status turunan dinamis (security_invoker diaktifkan)';

-- --------------------------------------------------------------------
-- 7. FUNGSI BANTU SQL: upsert_attendance_bulk
-- Melakukan input/update absensi massal dalam 1 transaksi atomik.
-- Parameter:
--   p_class_id: UUID kelas
--   p_date: Tanggal absensi
--   p_records: Array JSON [{ "student_id": "...", "status": "...", "note": "..." }]
--   p_recorded_by: UUID profil guru/admin pencatat (opsional, default dicari dari auth.uid())
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_attendance_bulk(
  p_class_id uuid,
  p_date date,
  p_records jsonb,
  p_recorded_by uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_rec jsonb;
  v_student_id uuid;
  v_status attendance_status;
  v_note text;
  v_recorder uuid;
  v_count integer := 0;
BEGIN
  -- Tentukan recorded_by: dari parameter atau dari auth.uid()
  v_recorder := p_recorded_by;
  IF v_recorder IS NULL THEN
    SELECT id INTO v_recorder FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
  END IF;

  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := (v_rec->>'student_id')::uuid;
    v_status := COALESCE((v_rec->>'status')::attendance_status, 'present'::attendance_status);
    v_note := v_rec->>'note';

    -- Override recorder jika disertakan di per-record
    IF v_rec ? 'recorded_by' THEN
      v_recorder := (v_rec->>'recorded_by')::uuid;
    END IF;

    IF v_recorder IS NULL THEN
      RAISE EXCEPTION 'recorded_by tidak boleh kosong saat mencatat absensi';
    END IF;

    -- Upsert ke tabel attendance
    INSERT INTO attendance (class_id, student_id, date, status, note, recorded_by, updated_at)
    VALUES (p_class_id, v_student_id, p_date, v_status, v_note, v_recorder, now())
    ON CONFLICT (student_id, class_id, date)
    DO UPDATE SET
      status = EXCLUDED.status,
      note = EXCLUDED.note,
      recorded_by = EXCLUDED.recorded_by,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION upsert_attendance_bulk IS 'Fungsi bulk upsert absensi per kelas secara atomik';

-- --------------------------------------------------------------------
-- 8. INDEXES
-- --------------------------------------------------------------------
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_class_id_date ON attendance(class_id, date);
CREATE INDEX idx_attendance_status ON attendance(status);

CREATE INDEX idx_leave_requests_student_id ON leave_requests(student_id);
CREATE INDEX idx_leave_requests_submitted_by ON leave_requests(submitted_by);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(date_from, date_to);

CREATE INDEX idx_assignments_teaching_id ON assignments(teaching_id);
CREATE INDEX idx_assignments_deadline ON assignments(deadline);

CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);


-- >>> FILE: 0003_communication.sql >>>
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


-- >>> FILE: 0004_auth.sql >>>
-- ====================================================================
-- MIGRATION: 0004_auth.sql
-- DESKRIPSI: Whitelist email di level database pada tabel auth.users
--             Supabase. Mencegah pendaftaran akun sembarang, memastikan
--             hanya email yang sudah didaftarkan admin di profiles yang
--             bisa masuk, serta mengunci provider Google OAuth untuk
--             akun riil (non-demo).
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TRIGGER BEFORE INSERT PADA auth.users
-- Memeriksa whitelist sebelum baris akun auth dibuat
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_auth_user_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_normalized_email text;
  v_profile RECORD;
  v_provider text;
BEGIN
  -- Normalisasi email pengguna baru
  v_normalized_email := public.normalize_gmail(NEW.email);

  -- Cari profil terdaftar yang aktif
  SELECT id, role, is_demo, is_active
  INTO v_profile
  FROM public.profiles
  WHERE email_normalized = v_normalized_email;

  -- 1. Tolak jika email belum didaftarkan oleh admin atau status dinonaktifkan
  IF v_profile IS NULL OR v_profile.is_active = false THEN
    RAISE EXCEPTION 'EMAIL_NOT_REGISTERED';
  END IF;

  -- 2. Dapatkan identitas provider (google, email, dll.)
  v_provider := NEW.raw_app_meta_data->>'provider';

  -- 3. Akun non-demo WAJIB masuk lewat Google OAuth untuk menjamin kepemilikan email
  IF v_profile.is_demo = false THEN
    IF v_provider IS NULL OR v_provider <> 'google' THEN
      RAISE EXCEPTION 'PROVIDER_NOT_ALLOWED';
    END IF;
  END IF;

  -- Akun demo (is_demo = true) diizinkan menggunakan provider email+password
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_auth_user_before_insert IS 'Trigger validasi whitelist email dan provider login sebelum pembuatan user auth (SECURITY DEFINER)';

DROP TRIGGER IF EXISTS trg_auth_users_before_insert ON auth.users;
CREATE TRIGGER trg_auth_users_before_insert
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_before_insert();

-- --------------------------------------------------------------------
-- 2. TRIGGER AFTER INSERT PADA auth.users
-- Menautkan auth_user_id di tabel profiles saat akun auth pertama kali dibuat
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_auth_user_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_normalized_email text;
BEGIN
  v_normalized_email := public.normalize_gmail(NEW.email);

  UPDATE public.profiles
  SET auth_user_id = NEW.id,
      updated_at = now()
  WHERE email_normalized = v_normalized_email;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_auth_user_after_insert IS 'Menautkan auth_user_id pada tabel profiles setelah user auth berhasil dibuat';

DROP TRIGGER IF EXISTS trg_auth_users_after_insert ON auth.users;
CREATE TRIGGER trg_auth_users_after_insert
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_after_insert();

-- --------------------------------------------------------------------
-- 3. TRIGGER AFTER UPDATE PADA auth.users
-- Menjaga sinkronisasi tautan auth_user_id jika terjadi pembaharuan identitas
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_auth_user_after_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.id IS NOT NULL AND NEW.email IS NOT NULL THEN
    UPDATE public.profiles
    SET auth_user_id = NEW.id,
        updated_at = now()
    WHERE email_normalized = public.normalize_gmail(NEW.email)
      AND (auth_user_id IS NULL OR auth_user_id <> NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_auth_user_after_update IS 'Menjaga sinkronisasi auth_user_id profiles jika terjadi perubahan pada auth.users';

DROP TRIGGER IF EXISTS trg_auth_users_after_update ON auth.users;
CREATE TRIGGER trg_auth_users_after_update
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_after_update();


-- >>> FILE: 0005_rls.sql >>>
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


-- >>> FILE: 0006_automation.sql >>>
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


-- >>> FILE: 0007_storage.sql >>>
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
  END;

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
  END;

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
  END;

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


-- >>> FILE: 0008_dashboard.sql >>>
-- ====================================================================
-- MIGRATION: 0008_dashboard.sql
-- DESKRIPSI: Fungsi agregasi data dashboard per role (SECURITY INVOKER,
--             STABLE, format JSONB), helper roster absensi cepat,
--             ringkasan perkembangan anak untuk ortu, dan badge lonceng.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. DASHBOARD MURID (dashboard_student)
-- Mengembalikan: today_schedule, upcoming_assignments, latest_grades,
--                unread_messages, unread_notifications.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_student()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_role user_role;
  v_class_id uuid;
  v_now_wib timestamptz;
  v_today_date date;
  v_dow integer;
  v_schedule jsonb;
  v_assignments jsonb;
  v_grades jsonb;
  v_unread_msgs integer;
  v_unread_notifs integer;
BEGIN
  v_student_id := current_profile_id();
  v_role := current_user_role();

  IF v_student_id IS NULL OR v_role <> 'student' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya murid yang dapat mengakses dashboard_student';
  END IF;

  v_class_id := student_class_id(v_student_id);
  v_now_wib := now() AT TIME ZONE 'Asia/Jakarta';
  v_today_date := v_now_wib::date;
  v_dow := EXTRACT(ISODOW FROM v_now_wib)::integer;

  -- 1. Jadwal hari ini
  SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'start_time')), '[]'::jsonb)
  INTO v_schedule
  FROM (
    SELECT jsonb_build_object(
      'schedule_id', s.id,
      'subject_name', sub.name,
      'teacher_name', p.full_name,
      'start_time', s.start_time,
      'end_time', s.end_time
    ) AS item
    FROM schedules s
    JOIN teachings t ON t.id = s.teaching_id
    JOIN subjects sub ON sub.id = t.subject_id
    JOIN profiles p ON p.id = t.teacher_id
    WHERE t.class_id = v_class_id
      AND s.day_of_week = v_dow
  ) q;

  -- 2. Tugas mendatang (maks 5, urut deadline terdekat)
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_assignments
  FROM (
    SELECT jsonb_build_object(
      'assignment_id', a.id,
      'title', a.title,
      'subject_name', sub.name,
      'teacher_name', p.full_name,
      'deadline', a.deadline,
      'status', asv.status,
      'score', asv.score
    ) AS item
    FROM assignments a
    JOIN teachings t ON t.id = a.teaching_id
    JOIN subjects sub ON sub.id = t.subject_id
    JOIN profiles p ON p.id = t.teacher_id
    LEFT JOIN assignment_status_view asv ON asv.assignment_id = a.id AND asv.student_id = v_student_id
    WHERE t.class_id = v_class_id
      AND a.deadline >= now()
    ORDER BY a.deadline ASC
    LIMIT 5
  ) q;

  -- 3. Nilai terbaru (maks 3)
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_grades
  FROM (
    SELECT jsonb_build_object(
      'submission_id', s.id,
      'assignment_title', a.title,
      'subject_name', sub.name,
      'score', s.score,
      'feedback', s.feedback,
      'graded_at', s.graded_at
    ) AS item
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN teachings t ON t.id = a.teaching_id
    JOIN subjects sub ON sub.id = t.subject_id
    WHERE s.student_id = v_student_id
      AND s.score IS NOT NULL
    ORDER BY COALESCE(s.graded_at, s.updated_at) DESC
    LIMIT 3
  ) q;

  -- 4. Pesan belum dibaca dalam thread murid
  SELECT COALESCE(SUM(unread_count(tp.thread_id, v_student_id)), 0)
  INTO v_unread_msgs
  FROM thread_participants tp
  WHERE tp.user_id = v_student_id;

  -- 5. Notifikasi belum dibaca
  SELECT count(*) INTO v_unread_notifs
  FROM notifications
  WHERE user_id = v_student_id AND is_read = false;

  RETURN jsonb_build_object(
    'role', 'student',
    'student_id', v_student_id,
    'today_schedule', v_schedule,
    'upcoming_assignments', v_assignments,
    'latest_grades', v_grades,
    'unread_messages', v_unread_msgs,
    'unread_notifications', v_unread_notifs
  );
END;
$$;

-- --------------------------------------------------------------------
-- 2. DASHBOARD GURU (dashboard_teacher)
-- Mengembalikan: today_classes, to_grade, unanswered_threads,
--                pending_leaves (khusus wali), attendance_today.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_teacher()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_teacher_id uuid;
  v_role user_role;
  v_is_homeroom boolean;
  v_now_wib timestamptz;
  v_today_date date;
  v_dow integer;
  v_today_classes jsonb;
  v_to_grade jsonb;
  v_threads jsonb;
  v_leaves jsonb;
  v_attendance_status jsonb;
BEGIN
  v_teacher_id := current_profile_id();
  v_role := current_user_role();

  IF v_teacher_id IS NULL OR v_role <> 'teacher' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya guru yang dapat mengakses dashboard_teacher';
  END IF;

  SELECT is_homeroom INTO v_is_homeroom FROM profiles WHERE id = v_teacher_id;
  v_is_homeroom := COALESCE(v_is_homeroom, false);

  v_now_wib := now() AT TIME ZONE 'Asia/Jakarta';
  v_today_date := v_now_wib::date;
  v_dow := EXTRACT(ISODOW FROM v_now_wib)::integer;

  -- 1. Jadwal kelas hari ini yang diampu
  SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'start_time')), '[]'::jsonb)
  INTO v_today_classes
  FROM (
    SELECT jsonb_build_object(
      'teaching_id', t.id,
      'class_id', c.id,
      'class_name', c.name,
      'subject_name', sub.name,
      'start_time', s.start_time,
      'end_time', s.end_time
    ) AS item
    FROM schedules s
    JOIN teachings t ON t.id = s.teaching_id
    JOIN classes c ON c.id = t.class_id
    JOIN subjects sub ON sub.id = t.subject_id
    WHERE t.teacher_id = v_teacher_id
      AND s.day_of_week = v_dow
  ) q;

  -- 2. Tugas yang perlu dinilai (pengumpulan belum dinilai)
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_to_grade
  FROM (
    SELECT jsonb_build_object(
      'submission_id', s.id,
      'assignment_id', a.id,
      'assignment_title', a.title,
      'student_id', p.id,
      'student_name', p.full_name,
      'class_name', c.name,
      'submitted_at', s.submitted_at
    ) AS item
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN teachings t ON t.id = a.teaching_id
    JOIN classes c ON c.id = t.class_id
    JOIN profiles p ON p.id = s.student_id
    WHERE t.teacher_id = v_teacher_id
      AND s.score IS NULL
    ORDER BY s.submitted_at ASC
    LIMIT 10
  ) q;

  -- 3. Pesan/thread yang belum dibalas (status 'new')
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_threads
  FROM (
    SELECT jsonb_build_object(
      'thread_id', th.id,
      'subject', th.subject,
      'category', th.category,
      'sender_name', creator.full_name,
      'sender_role', creator.role,
      'student_name', stu.full_name,
      'created_at', th.created_at,
      'unread_count', unread_count(th.id, v_teacher_id)
    ) AS item
    FROM threads th
    JOIN thread_participants tp ON tp.thread_id = th.id AND tp.user_id = v_teacher_id
    JOIN profiles creator ON creator.id = th.created_by
    LEFT JOIN profiles stu ON stu.id = th.student_id
    WHERE th.status = 'new'
      AND th.created_by <> v_teacher_id
    ORDER BY th.created_at DESC
    LIMIT 5
  ) q;

  -- 4. Pengajuan izin menunggu persetujuan (khusus kelas perwalian wali kelas)
  IF v_is_homeroom THEN
    SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
    INTO v_leaves
    FROM (
      SELECT jsonb_build_object(
        'leave_id', lr.id,
        'student_id', lr.student_id,
        'student_name', p.full_name,
        'type', lr.type,
        'date_from', lr.date_from,
        'date_to', lr.date_to,
        'reason', lr.reason,
        'created_at', lr.created_at
      ) AS item
      FROM leave_requests lr
      JOIN student_classes sc ON sc.student_id = lr.student_id
      JOIN classes c ON c.id = sc.class_id
      JOIN profiles p ON p.id = lr.student_id
      WHERE c.homeroom_teacher_id = v_teacher_id
        AND lr.status = 'pending'
      ORDER BY lr.created_at ASC
    ) q;
  ELSE
    v_leaves := '[]'::jsonb;
  END IF;

  -- 5. Status absensi hari ini per kelas binaan
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_attendance_status
  FROM (
    SELECT jsonb_build_object(
      'class_id', c.id,
      'class_name', c.name,
      'is_recorded', EXISTS (
        SELECT 1 FROM attendance att
        WHERE att.class_id = c.id AND att.date = v_today_date
      )
    ) AS item
    FROM classes c
    WHERE c.homeroom_teacher_id = v_teacher_id
       OR EXISTS (SELECT 1 FROM teachings t WHERE t.class_id = c.id AND t.teacher_id = v_teacher_id)
    GROUP BY c.id, c.name
  ) q;

  RETURN jsonb_build_object(
    'role', 'teacher',
    'teacher_id', v_teacher_id,
    'is_homeroom', v_is_homeroom,
    'today_classes', v_today_classes,
    'to_grade', v_to_grade,
    'unanswered_threads', v_threads,
    'pending_leaves', v_leaves,
    'attendance_today', v_attendance_status
  );
END;
$$;

-- --------------------------------------------------------------------
-- 3. DASHBOARD ORANG TUA (dashboard_parent)
-- Mengembalikan array ringkasan per anak, pengumuman terbaru, dan unread.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_parent()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
  v_role user_role;
  v_today_date date;
  v_children jsonb;
  v_announcements jsonb;
  v_unread_msgs integer;
BEGIN
  v_parent_id := current_profile_id();
  v_role := current_user_role();

  IF v_parent_id IS NULL OR v_role <> 'parent' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya orang tua yang dapat mengakses dashboard_parent';
  END IF;

  v_today_date := (now() AT TIME ZONE 'Asia/Jakarta')::date;

  -- 1. Kartu data per anak tertaut
  SELECT COALESCE(jsonb_agg(child_data), '[]'::jsonb)
  INTO v_children
  FROM (
    SELECT
      p.id AS student_id,
      p.full_name AS name,
      COALESCE(c.name, 'Belum Masuk Kelas') AS class_name,
      -- Status absen hari ini
      COALESCE(
        (SELECT att.status::text FROM attendance att WHERE att.student_id = p.id AND att.date = v_today_date LIMIT 1),
        'belum_diabsen'
      ) AS today_status,
      -- Tugas terlambat
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('assignment_id', asv.assignment_id, 'title', asv.assignment_title, 'deadline', asv.deadline))
        FROM assignment_status_view asv
        WHERE asv.student_id = p.id AND asv.status IN ('late', 'overdue_not_submitted')
      ), '[]'::jsonb) AS late_assignments,
      -- Nilai terbaru (maks 3)
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('assignment_title', a.title, 'score', s.score, 'graded_at', s.graded_at))
        FROM submissions s
        JOIN assignments a ON a.id = s.assignment_id
        WHERE s.student_id = p.id AND s.score IS NOT NULL
        ORDER BY s.graded_at DESC LIMIT 3
      ), '[]'::jsonb) AS latest_grades,
      -- Tugas mendatang
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('assignment_id', a.id, 'title', a.title, 'deadline', a.deadline))
        FROM assignments a
        JOIN teachings t ON t.id = a.teaching_id
        JOIN student_classes sc ON sc.class_id = t.class_id
        WHERE sc.student_id = p.id AND a.deadline >= now()
        ORDER BY a.deadline ASC LIMIT 3
      ), '[]'::jsonb) AS upcoming_assignments
    FROM parent_students ps
    JOIN profiles p ON p.id = ps.student_id
    LEFT JOIN student_classes sc ON sc.student_id = p.id
    LEFT JOIN classes c ON c.id = sc.class_id
    WHERE ps.parent_id = v_parent_id
  ) child_data;

  -- 2. Pengumuman terbaru untuk ortu (maks 3)
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_announcements
  FROM (
    SELECT jsonb_build_object(
      'id', an.id,
      'title', an.title,
      'body', left(an.body, 120),
      'is_pinned', an.is_pinned,
      'created_at', an.created_at
    ) AS item
    FROM announcements an
    WHERE an.target IN ('all', 'parents')
    ORDER BY an.is_pinned DESC, an.created_at DESC
    LIMIT 3
  ) q;

  -- 3. Pesan belum dibaca
  SELECT COALESCE(SUM(unread_count(tp.thread_id, v_parent_id)), 0)
  INTO v_unread_msgs
  FROM thread_participants tp
  WHERE tp.user_id = v_parent_id;

  RETURN jsonb_build_object(
    'role', 'parent',
    'children', v_children,
    'announcements', v_announcements,
    'unread_messages', v_unread_msgs
  );
END;
$$;

-- --------------------------------------------------------------------
-- 4. DASHBOARD ADMIN (dashboard_admin)
-- Mengembalikan: users_by_role, attendance_today_percent,
--                attendance_last_7_days, average_score_per_class,
--                students_high_absence, latest_announcements.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_admin()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_role user_role;
  v_today_date date;
  v_users_by_role jsonb;
  v_today_percent numeric(5, 2);
  v_last_7_days jsonb;
  v_class_averages jsonb;
  v_high_absence jsonb;
  v_announcements jsonb;
  v_tot_att integer;
  v_pres_att integer;
BEGIN
  v_admin_id := current_profile_id();
  v_role := current_user_role();

  IF v_admin_id IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya admin yang dapat mengakses dashboard_admin';
  END IF;

  v_today_date := (now() AT TIME ZONE 'Asia/Jakarta')::date;

  -- 1. Jumlah user per role
  SELECT jsonb_build_object(
    'admin', COUNT(*) FILTER (WHERE role = 'admin'),
    'teacher', COUNT(*) FILTER (WHERE role = 'teacher'),
    'student', COUNT(*) FILTER (WHERE role = 'student'),
    'parent', COUNT(*) FILTER (WHERE role = 'parent')
  )
  INTO v_users_by_role
  FROM profiles
  WHERE is_active = true;

  -- 2. Persentase kehadiran hari ini
  SELECT count(*), count(*) FILTER (WHERE status = 'present')
  INTO v_tot_att, v_pres_att
  FROM attendance
  WHERE date = v_today_date;

  IF v_tot_att > 0 THEN
    v_today_percent := round((v_pres_att::numeric / v_tot_att::numeric) * 100, 2);
  ELSE
    v_today_percent := 0.00;
  END IF;

  -- 3. Tren kehadiran 7 hari terakhir
  SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'date') ASC), '[]'::jsonb)
  INTO v_last_7_days
  FROM (
    SELECT jsonb_build_object(
      'date', d.day::date,
      'percent_present', CASE
        WHEN count(att.id) > 0 THEN round((count(att.id) FILTER (WHERE att.status = 'present')::numeric / count(att.id)::numeric) * 100, 2)
        ELSE 0.00
      END
    ) AS item
    FROM generate_series((v_today_date - interval '6 days')::date, v_today_date, interval '1 day') AS d(day)
    LEFT JOIN attendance att ON att.date = d.day::date
    GROUP BY d.day
  ) q;

  -- 4. Rata-rata nilai per kelas
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_class_averages
  FROM (
    SELECT jsonb_build_object(
      'class_id', c.id,
      'class_name', c.name,
      'average_score', COALESCE(round(avg(s.score), 2), 0.00)
    ) AS item
    FROM classes c
    LEFT JOIN student_classes sc ON sc.class_id = c.id
    LEFT JOIN submissions s ON s.student_id = sc.student_id AND s.score IS NOT NULL
    GROUP BY c.id, c.name
  ) q;

  -- 5. Murid dengan ketidakhadiran tinggi (alpa+sakit+izin >= 3 dalam 30 hari terakhir)
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_high_absence
  FROM (
    SELECT jsonb_build_object(
      'student_id', p.id,
      'student_name', p.full_name,
      'class_name', c.name,
      'total_absences', count(att.id),
      'sick_count', count(att.id) FILTER (WHERE att.status = 'sick'),
      'excused_count', count(att.id) FILTER (WHERE att.status = 'excused'),
      'absent_count', count(att.id) FILTER (WHERE att.status = 'absent')
    ) AS item
    FROM attendance att
    JOIN profiles p ON p.id = att.student_id
    JOIN student_classes sc ON sc.student_id = p.id
    JOIN classes c ON c.id = sc.class_id
    WHERE att.status <> 'present'
      AND att.date >= (v_today_date - interval '30 days')::date
    GROUP BY p.id, p.full_name, c.name
    HAVING count(att.id) >= 3
    ORDER BY count(att.id) DESC
  ) q;

  -- 6. Pengumuman terbaru
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_announcements
  FROM (
    SELECT jsonb_build_object(
      'id', an.id,
      'title', an.title,
      'target', an.target,
      'author_name', p.full_name,
      'created_at', an.created_at
    ) AS item
    FROM announcements an
    JOIN profiles p ON p.id = an.author_id
    ORDER BY an.created_at DESC
    LIMIT 5
  ) q;

  RETURN jsonb_build_object(
    'role', 'admin',
    'users_by_role', v_users_by_role,
    'attendance_today_percent', v_today_percent,
    'attendance_last_7_days', v_last_7_days,
    'average_score_per_class', v_class_averages,
    'students_high_absence', v_high_absence,
    'latest_announcements', v_announcements
  );
END;
$$;

-- --------------------------------------------------------------------
-- 5. FUNGSI BANTU LAINNYA
-- --------------------------------------------------------------------

-- 5.1 parent_child_summary(student_id): Detail perkembangan satu anak
CREATE OR REPLACE FUNCTION public.parent_child_summary(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_student_name text;
  v_class_name text;
  v_attendance_pct numeric(5, 2);
  v_tot_att integer;
  v_pres_att integer;
  v_recent_att jsonb;
  v_assignments jsonb;
  v_avg_by_subject jsonb;
BEGIN
  IF NOT can_view_student(p_student_id) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin melihat data murid ini';
  END IF;

  SELECT p.full_name, c.name
  INTO v_student_name, v_class_name
  FROM profiles p
  LEFT JOIN student_classes sc ON sc.student_id = p.id
  LEFT JOIN classes c ON c.id = sc.class_id
  WHERE p.id = p_student_id;

  -- Persentase kehadiran 30 hari terakhir
  SELECT count(*), count(*) FILTER (WHERE status = 'present')
  INTO v_tot_att, v_pres_att
  FROM attendance
  WHERE student_id = p_student_id
    AND date >= ((now() AT TIME ZONE 'Asia/Jakarta')::date - interval '30 days')::date;

  IF v_tot_att > 0 THEN
    v_attendance_pct := round((v_pres_att::numeric / v_tot_att::numeric) * 100, 2);
  ELSE
    v_attendance_pct := 100.00;
  END IF;

  -- Riwayat absen terbaru (10 terakhir)
  SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'date') DESC), '[]'::jsonb)
  INTO v_recent_att
  FROM (
    SELECT jsonb_build_object(
      'date', date,
      'status', status,
      'note', note
    ) AS item
    FROM attendance
    WHERE student_id = p_student_id
    ORDER BY date DESC
    LIMIT 10
  ) q;

  -- Daftar tugas dan status pengumpulan
  SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'deadline') DESC), '[]'::jsonb)
  INTO v_assignments
  FROM (
    SELECT jsonb_build_object(
      'assignment_id', a.id,
      'title', a.title,
      'subject_name', sub.name,
      'deadline', a.deadline,
      'status', asv.status,
      'score', asv.score
    ) AS item
    FROM assignments a
    JOIN teachings t ON t.id = a.teaching_id
    JOIN subjects sub ON sub.id = t.subject_id
    JOIN student_classes sc ON sc.class_id = t.class_id
    LEFT JOIN assignment_status_view asv ON asv.assignment_id = a.id AND asv.student_id = p_student_id
    WHERE sc.student_id = p_student_id
    LIMIT 20
  ) q;

  -- Rata-rata nilai per mata pelajaran
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_avg_by_subject
  FROM (
    SELECT jsonb_build_object(
      'subject_name', sub.name,
      'average_score', round(avg(s.score), 2)
    ) AS item
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN teachings t ON t.id = a.teaching_id
    JOIN subjects sub ON sub.id = t.subject_id
    WHERE s.student_id = p_student_id
      AND s.score IS NOT NULL
    GROUP BY sub.name
  ) q;

  RETURN jsonb_build_object(
    'student_id', p_student_id,
    'student_name', v_student_name,
    'class_name', v_class_name,
    'attendance_percent_30d', v_attendance_pct,
    'recent_attendance', v_recent_att,
    'assignments', v_assignments,
    'average_by_subject', v_avg_by_subject
  );
END;
$$;

-- 5.2 teacher_class_roster(class_id, date): Form absensi cepat
CREATE OR REPLACE FUNCTION public.teacher_class_roster(p_class_id uuid, p_date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT teaches_class(p_class_id) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak mengajar di kelas ini';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'student_name')), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'student_id', p.id,
        'student_name', p.full_name,
        'status', COALESCE(att.status::text, 'present'),
        'note', att.note
      ) AS item
      FROM student_classes sc
      JOIN profiles p ON p.id = sc.student_id
      LEFT JOIN attendance att ON att.student_id = p.id AND att.class_id = p_class_id AND att.date = p_date
      WHERE sc.class_id = p_class_id AND p.is_active = true
    ) q
  );
END;
$$;

-- 5.3 get_unread_notification_count(): Angka badge lonceng
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM notifications
  WHERE user_id = current_profile_id()
    AND is_read = false;
$$;

-- --------------------------------------------------------------------
-- 6. PERMISSIONS
-- --------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.dashboard_student() FROM anon;
REVOKE ALL ON FUNCTION public.dashboard_teacher() FROM anon;
REVOKE ALL ON FUNCTION public.dashboard_parent() FROM anon;
REVOKE ALL ON FUNCTION public.dashboard_admin() FROM anon;
REVOKE ALL ON FUNCTION public.parent_child_summary(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.teacher_class_roster(uuid, date) FROM anon;
REVOKE ALL ON FUNCTION public.get_unread_notification_count() FROM anon;

GRANT EXECUTE ON FUNCTION public.dashboard_student() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_parent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.parent_child_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_class_roster(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;


-- >>> FILE: 0009_leave_cancellation.sql >>>
-- ====================================================================
-- MIGRATION 0009: PEMBATALAN PERMOHONAN IZIN OLEH PENGAJU (STATUS PENDING)
-- ====================================================================

-- Policy DELETE: Pengaju izin (ortu atau murid) berhak membatalkan permohonannya
-- HANYA jika status pengajuan masih 'pending' (belum disetujui atau ditolak).
CREATE POLICY "leave_requests_cancel_by_submitter_policy"
ON public.leave_requests FOR DELETE
TO authenticated
USING (
  submitted_by = current_profile_id()
  AND status = 'pending'
);

COMMENT ON POLICY "leave_requests_cancel_by_submitter_policy" ON public.leave_requests IS
'Pengaju permohonan izin (ortu atau murid) dapat membatalkan pengajuan miliknya selama status masih pending';


-- >>> FILE: 0010_message_attachment_in_thread.sql >>>
-- ====================================================================
-- 0010_message_attachment_in_thread.sql
-- Mendukung lampiran opsional pada pesan pertama saat create_thread
-- ====================================================================

-- Drop overload lama tanpa parameter lampiran agar tidak terjadi ambiguitas nama fungsi
DROP FUNCTION IF EXISTS public.create_thread(thread_category, text, uuid, uuid[], text);

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

COMMENT ON FUNCTION public.create_thread(thread_category, text, uuid, uuid[], text, text) IS 'Fungsi RPC pembuatan thread percakapan terverifikasi dengan penegakan matriks privasi dan dukungan lampiran (SECURITY DEFINER)';


-- >>> FILE: 0011_announcement_read_stats.sql >>>
-- ====================================================================
-- 0011_announcement_read_stats.sql
-- RPC statistik pembaca pengumuman khusus penulis dan admin
-- ====================================================================

CREATE OR REPLACE FUNCTION public.announcement_read_stats(p_announcement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_is_adm boolean;
  v_author_id uuid;
  v_target announcement_target;
  v_class_id uuid;
  v_total_target integer;
  v_read_count integer;
  v_unread_users jsonb;
BEGIN
  v_caller_id := current_profile_id();
  v_is_adm := is_admin();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: sesi login tidak valid';
  END IF;

  -- Ambil data pengumuman
  SELECT author_id, target, class_id
  INTO v_author_id, v_target, v_class_id
  FROM announcements
  WHERE id = p_announcement_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Pengumuman tidak ditemukan';
  END IF;

  -- Penegakan privasi: hanya penulis atau admin
  IF v_caller_id <> v_author_id AND NOT v_is_adm THEN
    RAISE EXCEPTION 'Akses ditolak: hanya penulis atau admin yang dapat melihat statistik pembaca pengumuman ini';
  END IF;

  -- Kumpulkan target audiens ke tabel sementara
  CREATE TEMP TABLE temp_announcement_audience (
    user_id uuid PRIMARY KEY,
    full_name text,
    role user_role
  ) ON COMMIT DROP;

  IF v_target = 'all' THEN
    INSERT INTO temp_announcement_audience (user_id, full_name, role)
    SELECT id, full_name, role
    FROM profiles
    WHERE is_active = true AND id <> v_author_id AND role <> 'admin'
    ON CONFLICT DO NOTHING;

  ELSIF v_target = 'parents' THEN
    INSERT INTO temp_announcement_audience (user_id, full_name, role)
    SELECT id, full_name, role
    FROM profiles
    WHERE is_active = true AND role = 'parent' AND id <> v_author_id
    ON CONFLICT DO NOTHING;

  ELSIF v_target = 'class' THEN
    -- 1. Murid kelas
    INSERT INTO temp_announcement_audience (user_id, full_name, role)
    SELECT p.id, p.full_name, p.role
    FROM profiles p
    JOIN student_classes sc ON sc.student_id = p.id
    WHERE sc.class_id = v_class_id AND p.is_active = true AND p.id <> v_author_id
    ON CONFLICT DO NOTHING;

    -- 2. Orang tua murid kelas
    INSERT INTO temp_announcement_audience (user_id, full_name, role)
    SELECT p.id, p.full_name, p.role
    FROM profiles p
    JOIN parent_students ps ON ps.parent_id = p.id
    JOIN student_classes sc ON sc.student_id = ps.student_id
    WHERE sc.class_id = v_class_id AND p.is_active = true AND p.id <> v_author_id
    ON CONFLICT DO NOTHING;

    -- 3. Guru yang mengajar kelas
    INSERT INTO temp_announcement_audience (user_id, full_name, role)
    SELECT p.id, p.full_name, p.role
    FROM profiles p
    JOIN teachings t ON t.teacher_id = p.id
    WHERE t.class_id = v_class_id AND p.is_active = true AND p.id <> v_author_id
    ON CONFLICT DO NOTHING;
  END IF;

  -- Hitung total target
  SELECT count(*) INTO v_total_target FROM temp_announcement_audience;

  -- Hitung yang sudah membaca
  SELECT count(*) INTO v_read_count
  FROM temp_announcement_audience aud
  WHERE EXISTS (
    SELECT 1 FROM announcement_reads ar
    WHERE ar.announcement_id = p_announcement_id AND ar.user_id = aud.user_id
  );

  -- Daftar target yang BELUM membaca (limit 50 agar respons ringan)
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  INTO v_unread_users
  FROM (
    SELECT jsonb_build_object(
      'id', aud.user_id,
      'full_name', aud.full_name,
      'role', aud.role
    ) AS item
    FROM temp_announcement_audience aud
    WHERE NOT EXISTS (
      SELECT 1 FROM announcement_reads ar
      WHERE ar.announcement_id = p_announcement_id AND ar.user_id = aud.user_id
    )
    ORDER BY aud.role, aud.full_name
    LIMIT 50
  ) q;

  RETURN jsonb_build_object(
    'total_target', v_total_target,
    'read_count', v_read_count,
    'unread_users', v_unread_users
  );
END;
$$;

COMMENT ON FUNCTION public.announcement_read_stats IS 'Menghitung statistik pembaca pengumuman secara aman khusus untuk penulis dan admin (SECURITY DEFINER)';


-- >>> FILE: seed.sql >>>

-- ====================================================================
-- SEED DATA AWAL OTOMATIS UNTUK DEMO SEKOLAHKU
-- ====================================================================

-- 1. Insert Akun Demo ke Tabel profiles
INSERT INTO public.profiles (email, email_normalized, full_name, role, is_homeroom, is_demo, is_active)
VALUES
  ('admin.sari@demo.sekolahku.test', 'admin.sari@demo.sekolahku.test', 'Bu Sari (Admin)', 'admin', false, true, true),
  ('guru.dedi@demo.sekolahku.test', 'guru.dedi@demo.sekolahku.test', 'Pak Dedi (Wali Kelas)', 'teacher', true, true, true),
  ('guru.lina@demo.sekolahku.test', 'guru.lina@demo.sekolahku.test', 'Bu Lina (Guru Mapel)', 'teacher', false, true, true),
  ('murid.raka@demo.sekolahku.test', 'murid.raka@demo.sekolahku.test', 'Raka Pratama', 'student', false, true, true),
  ('murid.nadia@demo.sekolahku.test', 'murid.nadia@demo.sekolahku.test', 'Nadia Putri', 'student', false, true, true),
  ('murid.bima@demo.sekolahku.test', 'murid.bima@demo.sekolahku.test', 'Bima Arya', 'student', false, true, true),
  ('ortu.hendra@demo.sekolahku.test', 'ortu.hendra@demo.sekolahku.test', 'Pak Hendra (Ortu)', 'parent', false, true, true),
  ('ortu.wati@demo.sekolahku.test', 'ortu.wati@demo.sekolahku.test', 'Bu Wati (Ortu)', 'parent', false, true, true)
ON CONFLICT (email_normalized) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_homeroom = EXCLUDED.is_homeroom,
  is_demo = EXCLUDED.is_demo,
  is_active = EXCLUDED.is_active;

-- 2. Insert Kelas (Classes)
INSERT INTO public.classes (name, academic_year)
VALUES 
  ('XI RPL 1', '2025/2026'),
  ('XI RPL 2', '2025/2026')
ON CONFLICT (name, academic_year) DO NOTHING;

-- Tautkan Pak Dedi sebagai Wali Kelas XI RPL 1
UPDATE public.classes
SET homeroom_teacher_id = (SELECT id FROM public.profiles WHERE email_normalized = 'guru.dedi@demo.sekolahku.test' LIMIT 1)
WHERE name = 'XI RPL 1' AND academic_year = '2025/2026';

-- 3. Insert Mata Pelajaran (Subjects)
INSERT INTO public.subjects (name)
VALUES 
  ('Pemrograman Web dan Perangkat Bergerak'),
  ('Basis Data'),
  ('Pemodelan Perangkat Lunak'),
  ('Bahasa Indonesia'),
  ('Matematika Terapan')
ON CONFLICT (name) DO NOTHING;

-- 4. Tautkan Murid ke Kelas, Penugasan Mengajar, Jadwal, dan Tugas
DO $$
DECLARE
  v_class_id uuid;
  v_raka_id uuid;
  v_nadia_id uuid;
  v_bima_id uuid;
  v_hendra_id uuid;
  v_wati_id uuid;
  v_dedi_id uuid;
  v_lina_id uuid;
  v_sari_id uuid;
  v_subj_pweb uuid;
  v_subj_bdat uuid;
  v_teach_pweb uuid;
  v_teach_bdat uuid;
  v_assign_id uuid;
BEGIN
  SELECT id INTO v_class_id FROM public.classes WHERE name = 'XI RPL 1' LIMIT 1;
  SELECT id INTO v_raka_id FROM public.profiles WHERE email_normalized = 'murid.raka@demo.sekolahku.test' LIMIT 1;
  SELECT id INTO v_nadia_id FROM public.profiles WHERE email_normalized = 'murid.nadia@demo.sekolahku.test' LIMIT 1;
  SELECT id INTO v_bima_id FROM public.profiles WHERE email_normalized = 'murid.bima@demo.sekolahku.test' LIMIT 1;
  SELECT id INTO v_hendra_id FROM public.profiles WHERE email_normalized = 'ortu.hendra@demo.sekolahku.test' LIMIT 1;
  SELECT id INTO v_wati_id FROM public.profiles WHERE email_normalized = 'ortu.wati@demo.sekolahku.test' LIMIT 1;
  SELECT id INTO v_dedi_id FROM public.profiles WHERE email_normalized = 'guru.dedi@demo.sekolahku.test' LIMIT 1;
  SELECT id INTO v_lina_id FROM public.profiles WHERE email_normalized = 'guru.lina@demo.sekolahku.test' LIMIT 1;
  SELECT id INTO v_sari_id FROM public.profiles WHERE email_normalized = 'admin.sari@demo.sekolahku.test' LIMIT 1;
  SELECT id INTO v_subj_pweb FROM public.subjects WHERE name = 'Pemrograman Web dan Perangkat Bergerak' LIMIT 1;
  SELECT id INTO v_subj_bdat FROM public.subjects WHERE name = 'Basis Data' LIMIT 1;

  -- student_classes
  IF v_class_id IS NOT NULL AND v_raka_id IS NOT NULL THEN
    INSERT INTO public.student_classes (student_id, class_id) VALUES (v_raka_id, v_class_id) ON CONFLICT (student_id) DO NOTHING;
  END IF;
  IF v_class_id IS NOT NULL AND v_nadia_id IS NOT NULL THEN
    INSERT INTO public.student_classes (student_id, class_id) VALUES (v_nadia_id, v_class_id) ON CONFLICT (student_id) DO NOTHING;
  END IF;
  IF v_class_id IS NOT NULL AND v_bima_id IS NOT NULL THEN
    INSERT INTO public.student_classes (student_id, class_id) VALUES (v_bima_id, v_class_id) ON CONFLICT (student_id) DO NOTHING;
  END IF;

  -- parent_students
  IF v_hendra_id IS NOT NULL AND v_raka_id IS NOT NULL THEN
    INSERT INTO public.parent_students (parent_id, student_id) VALUES (v_hendra_id, v_raka_id) ON CONFLICT (parent_id, student_id) DO NOTHING;
  END IF;
  IF v_wati_id IS NOT NULL AND v_nadia_id IS NOT NULL THEN
    INSERT INTO public.parent_students (parent_id, student_id) VALUES (v_wati_id, v_nadia_id) ON CONFLICT (parent_id, student_id) DO NOTHING;
  END IF;

  -- teachings
  IF v_class_id IS NOT NULL AND v_dedi_id IS NOT NULL AND v_subj_pweb IS NOT NULL THEN
    INSERT INTO public.teachings (teacher_id, class_id, subject_id)
    VALUES (v_dedi_id, v_class_id, v_subj_pweb)
    ON CONFLICT (teacher_id, subject_id, class_id) DO NOTHING;

    SELECT id INTO v_teach_pweb FROM public.teachings
    WHERE teacher_id = v_dedi_id AND class_id = v_class_id AND subject_id = v_subj_pweb
    LIMIT 1;
  END IF;

  IF v_class_id IS NOT NULL AND v_lina_id IS NOT NULL AND v_subj_bdat IS NOT NULL THEN
    INSERT INTO public.teachings (teacher_id, class_id, subject_id)
    VALUES (v_lina_id, v_class_id, v_subj_bdat)
    ON CONFLICT (teacher_id, subject_id, class_id) DO NOTHING;

    SELECT id INTO v_teach_bdat FROM public.teachings
    WHERE teacher_id = v_lina_id AND class_id = v_class_id AND subject_id = v_subj_bdat
    LIMIT 1;
  END IF;

  -- schedules
  IF v_teach_pweb IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.schedules WHERE teaching_id = v_teach_pweb AND day_of_week = 1) THEN
      INSERT INTO public.schedules (teaching_id, day_of_week, start_time, end_time)
      VALUES (v_teach_pweb, 1, '07:30', '09:45'), (v_teach_pweb, 3, '10:15', '12:30');
    END IF;
  END IF;

  -- sample assignment (deadline NOT due_date)
  IF v_teach_pweb IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.assignments WHERE teaching_id = v_teach_pweb AND title = 'Tugas 01: CRUD Database dengan REST API') THEN
      INSERT INTO public.assignments (teaching_id, title, description, deadline)
      VALUES (v_teach_pweb, 'Tugas 01: CRUD Database dengan REST API', 'Buat endpoint CRUD lengkap dengan Express dan PostgreSQL.', NOW() + INTERVAL '2 days')
      RETURNING id INTO v_assign_id;
    END IF;
  END IF;

  -- sample announcement (body NOT content, target NOT target_role)
  IF v_sari_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.announcements WHERE author_id = v_sari_id AND title = 'Selamat Datang di Semester Genap SMK Sekolahku') THEN
      INSERT INTO public.announcements (author_id, title, body, target, is_pinned)
      VALUES (v_sari_id, 'Selamat Datang di Semester Genap SMK Sekolahku', 'Seluruh kegiatan belajar mengajar dimulai tepat waktu. Harap cek jadwal pelajaran dan tugas harian di portal masing-masing.', 'all', true);
    END IF;
  END IF;
END $$;
