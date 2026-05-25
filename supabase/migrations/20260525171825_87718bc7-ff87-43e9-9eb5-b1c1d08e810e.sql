
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-certificates', 'partner-certificates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "partner_certs_public_read" ON storage.objects;
CREATE POLICY "partner_certs_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-certificates');

DROP POLICY IF EXISTS "partner_certs_admin_write" ON storage.objects;
CREATE POLICY "partner_certs_admin_write"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'partner-certificates' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "partner_certs_admin_update" ON storage.objects;
CREATE POLICY "partner_certs_admin_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'partner-certificates' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "partner_certs_admin_delete" ON storage.objects;
CREATE POLICY "partner_certs_admin_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'partner-certificates' AND public.has_role(auth.uid(), 'admin'));
