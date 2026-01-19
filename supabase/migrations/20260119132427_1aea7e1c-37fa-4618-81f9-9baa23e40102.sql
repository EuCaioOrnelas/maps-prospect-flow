-- Make chat-media bucket public so Evolution API can access the files
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-media';

-- Ensure proper storage policies exist for chat-media bucket

-- Allow authenticated users to upload files to their own folder
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
CREATE POLICY "Users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own files
DROP POLICY IF EXISTS "Users can update own chat media" ON storage.objects;
CREATE POLICY "Users can update own chat media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "Users can delete own chat media" ON storage.objects;
CREATE POLICY "Users can delete own chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access since bucket is now public
DROP POLICY IF EXISTS "Public read access to chat media" ON storage.objects;
CREATE POLICY "Public read access to chat media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');