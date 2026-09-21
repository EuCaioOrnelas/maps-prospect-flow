ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS consent jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'form_uploads_owner_read'
  ) THEN
    CREATE POLICY form_uploads_owner_read
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'form-uploads'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR (storage.foldername(name))[1] = public.current_account_owner()::text
        )
      );
  END IF;
END $$;