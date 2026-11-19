-- ====================================================================
-- TEST SUITE: automation_test.sql
-- DESKRIPSI: Verifikasi manual Trigger Notifikasi dan Supabase Storage.
-- ====================================================================

BEGIN;

-- 1. Uji fungsi anti-spam create_notification (5 menit)
SELECT create_notification(
  (SELECT id FROM profiles LIMIT 1),
  'announcement',
  'Judul Tes',
  'Isi Notifikasi Tes',
  NULL
);

-- Panggilan kedua dalam 5 menit harus mengembalikan NULL (dilewati):
SELECT create_notification(
  (SELECT id FROM profiles LIMIT 1),
  'announcement',
  'Judul Tes',
  'Isi Notifikasi Tes',
  NULL
);

-- 2. Uji fungsi pembersih notifikasi lama
SELECT purge_old_notifications();

-- 3. Uji fungsi notify_due_soon()
SELECT notify_due_soon();

ROLLBACK;
