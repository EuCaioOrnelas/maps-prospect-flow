-- ============================================================
-- PRODUÇÃO: cria a pasta de arquivos "wiize-updates" (vídeos e
-- imagens das Novidades) e libera envio/leitura para o admin.
-- Pode rodar quantas vezes quiser (é seguro repetir).
-- Requer as migrations 0044/0045 já aplicadas
-- (funções is_current_user_admin e update_is_available).
-- ============================================================

-- 1) Cria a pasta privada (ou ajusta se já existir), limite de 50 MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wiize-updates',
  'wiize-updates',
  false,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm'];

-- 2) Admin pode enviar arquivos (na pasta com o próprio id)
DROP POLICY IF EXISTS updates_media_admin_insert ON storage.objects;
CREATE POLICY updates_media_admin_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'wiize-updates'
  AND public.is_current_user_admin()
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','mp4','webm')
);

-- 3) Admin vê tudo; usuários veem só a mídia de novidades liberadas para eles
DROP POLICY IF EXISTS updates_media_read ON storage.objects;
CREATE POLICY updates_media_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'wiize-updates'
  AND (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE (a.media_path = name OR a.poster_path = name)
        AND public.update_is_available(a, auth.uid())
    )
  )
);

-- 4) Admin pode apagar arquivos que não estão em uso
DROP POLICY IF EXISTS updates_media_delete ON storage.objects;
CREATE POLICY updates_media_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'wiize-updates'
  AND public.is_current_user_admin()
  AND NOT EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.media_path = name OR a.poster_path = name
  )
);

-- 5) Conferência: deve retornar 1 linha com wiize-updates
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'wiize-updates';
