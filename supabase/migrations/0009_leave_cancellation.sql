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
