
-- Create storage bucket for agent media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-media', 
  'agent-media', 
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload agent media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own agent media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'agent-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own agent media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agent-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read access since bucket is public
CREATE POLICY "Public can read agent media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'agent-media');
