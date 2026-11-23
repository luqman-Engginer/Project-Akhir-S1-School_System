
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
INSERT INTO public.subjects (code, name)
VALUES 
  ('PWEB', 'Pemrograman Web dan Perangkat Bergerak'),
  ('BDAT', 'Basis Data'),
  ('PPL', 'Pemodelan Perangkat Lunak'),
  ('BIND', 'Bahasa Indonesia'),
  ('MTK', 'Matematika Terapan')
ON CONFLICT (code) DO NOTHING;

-- 4. Tautkan Murid ke Kelas (student_classes)
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
  SELECT id INTO v_raka_id FROM public.profiles WHERE email_normalized = 'murid.raka@demo.sekolahku.test';
  SELECT id INTO v_nadia_id FROM public.profiles WHERE email_normalized = 'murid.nadia@demo.sekolahku.test';
  SELECT id INTO v_bima_id FROM public.profiles WHERE email_normalized = 'murid.bima@demo.sekolahku.test';
  SELECT id INTO v_hendra_id FROM public.profiles WHERE email_normalized = 'ortu.hendra@demo.sekolahku.test';
  SELECT id INTO v_wati_id FROM public.profiles WHERE email_normalized = 'ortu.wati@demo.sekolahku.test';
  SELECT id INTO v_dedi_id FROM public.profiles WHERE email_normalized = 'guru.dedi@demo.sekolahku.test';
  SELECT id INTO v_lina_id FROM public.profiles WHERE email_normalized = 'guru.lina@demo.sekolahku.test';
  SELECT id INTO v_sari_id FROM public.profiles WHERE email_normalized = 'admin.sari@demo.sekolahku.test';
  SELECT id INTO v_subj_pweb FROM public.subjects WHERE code = 'PWEB';
  SELECT id INTO v_subj_bdat FROM public.subjects WHERE code = 'BDAT';

  -- student_classes
  IF v_class_id IS NOT NULL AND v_raka_id IS NOT NULL THEN
    INSERT INTO public.student_classes (student_id, class_id) VALUES (v_raka_id, v_class_id) ON CONFLICT DO NOTHING;
  END IF;
  IF v_class_id IS NOT NULL AND v_nadia_id IS NOT NULL THEN
    INSERT INTO public.student_classes (student_id, class_id) VALUES (v_nadia_id, v_class_id) ON CONFLICT DO NOTHING;
  END IF;
  IF v_class_id IS NOT NULL AND v_bima_id IS NOT NULL THEN
    INSERT INTO public.student_classes (student_id, class_id) VALUES (v_bima_id, v_class_id) ON CONFLICT DO NOTHING;
  END IF;

  -- parent_students
  IF v_hendra_id IS NOT NULL AND v_raka_id IS NOT NULL THEN
    INSERT INTO public.parent_students (parent_id, student_id) VALUES (v_hendra_id, v_raka_id) ON CONFLICT DO NOTHING;
  END IF;
  IF v_wati_id IS NOT NULL AND v_nadia_id IS NOT NULL THEN
    INSERT INTO public.parent_students (parent_id, student_id) VALUES (v_wati_id, v_nadia_id) ON CONFLICT DO NOTHING;
  END IF;

  -- teachings
  IF v_class_id IS NOT NULL AND v_dedi_id IS NOT NULL AND v_subj_pweb IS NOT NULL THEN
    INSERT INTO public.teachings (teacher_id, class_id, subject_id)
    VALUES (v_dedi_id, v_class_id, v_subj_pweb)
    ON CONFLICT (teacher_id, class_id, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id
    RETURNING id INTO v_teach_pweb;
  END IF;

  IF v_class_id IS NOT NULL AND v_lina_id IS NOT NULL AND v_subj_bdat IS NOT NULL THEN
    INSERT INTO public.teachings (teacher_id, class_id, subject_id)
    VALUES (v_lina_id, v_class_id, v_subj_bdat)
    ON CONFLICT (teacher_id, class_id, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id
    RETURNING id INTO v_teach_bdat;
  END IF;

  -- schedules
  IF v_teach_pweb IS NOT NULL THEN
    INSERT INTO public.schedules (teaching_id, day_of_week, start_time, end_time)
    VALUES (v_teach_pweb, 1, '07:30', '09:45'), (v_teach_pweb, 3, '10:15', '12:30')
    ON CONFLICT DO NOTHING;
  END IF;

  -- sample assignment
  IF v_teach_pweb IS NOT NULL THEN
    INSERT INTO public.assignments (teaching_id, title, description, due_date)
    VALUES (v_teach_pweb, 'Tugas 01: CRUD Database dengan REST API', 'Buat endpoint CRUD lengkap dengan Express dan PostgreSQL.', NOW() + INTERVAL '2 days')
    RETURNING id INTO v_assign_id;
  END IF;

  -- sample announcement
  IF v_sari_id IS NOT NULL THEN
    INSERT INTO public.announcements (author_id, title, content, target_role, is_pinned)
    VALUES (v_sari_id, 'Selamat Datang di Semester Genap SMK Sekolahku', 'Seluruh kegiatan belajar mengajar dimulai tepat waktu. Harap cek jadwal pelajaran dan tugas harian di portal masing-masing.', 'all', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
