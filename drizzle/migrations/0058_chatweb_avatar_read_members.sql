DROP POLICY IF EXISTS chatweb_avatars_read ON storage.objects;
CREATE POLICY chatweb_avatars_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chatweb-avatars' AND public.is_account_member(((storage.foldername(name))[1])::uuid));