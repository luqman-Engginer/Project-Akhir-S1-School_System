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
