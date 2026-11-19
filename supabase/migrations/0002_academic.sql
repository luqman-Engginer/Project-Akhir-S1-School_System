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
