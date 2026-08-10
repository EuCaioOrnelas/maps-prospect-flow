DROP POLICY IF EXISTS "sdr_proposals_select_own" ON storage.objects;
DROP POLICY IF EXISTS "sdr_proposals_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "sdr_proposals_update_own" ON storage.objects;
DROP POLICY IF EXISTS "sdr_proposals_delete_own" ON storage.objects;

CREATE POLICY "sdr_proposals_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sdr-proposals'
  AND (storage.foldername(name))[1] = COALESCE(public.get_account_owner(auth.uid())::text, auth.uid()::text)
);

CREATE POLICY "sdr_proposals_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sdr-proposals'
  AND (storage.foldername(name))[1] = COALESCE(public.get_account_owner(auth.uid())::text, auth.uid()::text)
);

CREATE POLICY "sdr_proposals_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'sdr-proposals'
  AND (storage.foldername(name))[1] = COALESCE(public.get_account_owner(auth.uid())::text, auth.uid()::text)
);

CREATE POLICY "sdr_proposals_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'sdr-proposals'
  AND (storage.foldername(name))[1] = COALESCE(public.get_account_owner(auth.uid())::text, auth.uid()::text)
);