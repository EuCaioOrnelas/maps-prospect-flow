DROP POLICY IF EXISTS updates_media_admin_insert ON storage.objects;
CREATE POLICY updates_media_admin_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'wiize-updates'
  AND public.is_current_user_admin()
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm')
  AND (
    metadata IS NULL OR metadata = '{}'::jsonb
    OR ((metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp') AND (metadata->>'size')::bigint <= 5242880)
      OR (metadata->>'mimetype' IN ('video/mp4','video/webm') AND (metadata->>'size')::bigint <= 52428800))
  )
);