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
