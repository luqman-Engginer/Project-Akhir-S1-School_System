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
