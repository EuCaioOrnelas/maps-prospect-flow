
-- Create storage bucket for WhatsApp flow media (images, audio, video, documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wa-flow-media',
  'wa-flow-media',
  true,
  20971520, -- 20MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav',
    'video/mp4', 'video/webm',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload flow media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wa-flow-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: anyone can view (public bucket)
CREATE POLICY "Public can view flow media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wa-flow-media');

-- RLS: users can delete their own files
CREATE POLICY "Users can delete own flow media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wa-flow-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
