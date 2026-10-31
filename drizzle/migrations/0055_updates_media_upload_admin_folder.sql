ALTER POLICY updates_media_admin_insert ON storage.objects WITH CHECK (
  bucket_id = 'wiize-updates'
  AND public.is_current_user_admin()
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm')
);
COMMENT ON POLICY updates_media_admin_insert ON storage.objects IS 'Admin-only own-folder uploads. Storage enforces bucket size; announcements trigger validates completed media MIME before publication. Initial Storage INSERT metadata may be incomplete.';