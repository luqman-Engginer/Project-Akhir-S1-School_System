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
