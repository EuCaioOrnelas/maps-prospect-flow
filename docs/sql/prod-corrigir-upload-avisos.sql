-- Antes de executar, configure pela tela/API de armazenamento o bucket
-- privado wiize-updates, com limite por arquivo de 50 MB.
-- Requer as funções e validações das migrations 0044 e 0045 já aplicadas.
-- A operação inicial de upload ainda não tem metadados completos.
-- O limite é aplicado pelo Storage e o tipo da mídia é conferido pelo
-- trigger updates_validate_media_fields antes de salvar a publicação.
DROP POLICY IF EXISTS updates_media_admin_insert ON storage.objects;
CREATE POLICY updates_media_admin_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'wiize-updates'
  AND public.is_current_user_admin()
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm')
);