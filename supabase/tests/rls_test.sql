-- ====================================================================
-- TEST SUITE: rls_test.sql
-- DESKRIPSI: Verifikasi manual Row Level Security (RLS) di Supabase SQL Editor.
--             Gunakan blok transaksi ROLLBACK agar tidak mengotori data.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. Verifikasi Status RLS Aktif pada Seluruh Tabel
-- --------------------------------------------------------------------
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
-- Semua tabel harus memiliki rowsecurity = true

-- --------------------------------------------------------------------
-- 2. Uji Coba Anonim (Role anon)
-- --------------------------------------------------------------------
SET LOCAL ROLE anon;

-- Test (h): Anonim dilarang membaca tabel apa pun (Harus return 0 rows atau permission denied)
SELECT count(*) FROM profiles;
SELECT count(*) FROM classes;
SELECT count(*) FROM attendance;
SELECT count(*) FROM messages;
SELECT count(*) FROM notifications;

RESET ROLE;

-- --------------------------------------------------------------------
-- 3. Uji Coba Simulasi Sesi (Authenticated User Impersonation)
-- --------------------------------------------------------------------
-- Contoh pengujian impersonasi dengan mensimulasikan auth.uid():
-- (Ganti UUID di bawah dengan auth_user_id akun demo Anda)

/*
-- Misal simulasi login sebagai Murid Raka:
SET LOCAL "request.jwt.claim.sub" = '<AUTH_USER_ID_RAKA>';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL ROLE authenticated;

-- Murid Raka hanya bisa melihat profil dirinya dan gurunya:
SELECT id, full_name, role FROM profiles;

-- Murid Raka mencoba mengubah score miliknya sendiri (Harus GAGAL):
-- UPDATE submissions SET score = 100 WHERE student_id = current_profile_id();

RESET ROLE;
*/

ROLLBACK;
