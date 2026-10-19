-- Limpeza automática diária (03:30 UTC): apaga vídeos/áudios/documentos do chat
-- com mais de 60 dias e fotos com mais de 90 dias. Textos das conversas ficam.
SELECT cron.unschedule('chat-media-auto-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chat-media-auto-cleanup');

SELECT cron.schedule('chat-media-auto-cleanup', '30 3 * * *', $$
  SET storage.allow_delete_query = 'true';
  DELETE FROM storage.objects
  WHERE bucket_id = 'chat-media'
    AND (
      (created_at < now() - interval '60 days' AND coalesce(metadata->>'mimetype','') NOT LIKE 'image/%')
      OR created_at < now() - interval '90 days'
    );
$$);
