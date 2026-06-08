
DROP POLICY IF EXISTS "Public read blog-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload blog-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update blog-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete blog-images" ON storage.objects;

CREATE POLICY "Public read blog-images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated upload blog-images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Authenticated update blog-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated delete blog-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'blog-images');
