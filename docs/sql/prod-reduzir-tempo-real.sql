-- ============================================================
-- Tira do "tempo real" 7 tabelas que nenhuma tela acompanha ao vivo.
-- Isso reduz o trabalho do banco a cada alteração nessas tabelas.
-- Nada é apagado; os dados continuam salvos normalmente.
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['agent_conversations','agent_message_buffer','agent_message_logs',
                           'ai_agents','campaign_processor_heartbeats',
                           'warming_interactions','warming_sessions']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_publication_tables
               WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Limpar histórico dos agendamentos (manter só 1 dia)
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '1 day';

-- Conferência
SELECT count(*) AS tabelas_em_tempo_real
FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
