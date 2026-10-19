-- ============================================================
-- ALÍVIO DE CARGA DO BANCO DE PRODUÇÃO
-- Rode por blocos no SQL Editor do banco de produção.
-- ============================================================

-- BLOCO 1 — Colunas que faltam no banco de produção (erro 42703)
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS opened_at timestamptz;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS opened_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS clicked_at timestamptz;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS clicked_count integer NOT NULL DEFAULT 0;

-- BLOCO 2 — Ver os agendamentos e com que frequência rodam
SELECT jobid, jobname, schedule, active
FROM cron.job
ORDER BY schedule;

-- BLOCO 3 — Agendamentos que mais demoram ou falham (últimas 24h)
SELECT j.jobname,
       count(*)                                         AS execucoes,
       count(*) FILTER (WHERE d.status <> 'succeeded')  AS falhas,
       round(avg(extract(epoch FROM d.end_time - d.start_time))::numeric, 1) AS segundos_medios
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE d.start_time > now() - interval '24 hours'
GROUP BY j.jobname
ORDER BY execucoes DESC;

-- BLOCO 4 — Limpar o histórico de execuções (essa tabela cresce sem parar e pesa)
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days';

-- BLOCO 5 — Consultas mais pesadas do banco
SELECT round(total_exec_time::numeric) AS ms_total,
       calls,
       round(mean_exec_time::numeric, 1) AS ms_media,
       left(query, 160) AS consulta
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 15;

-- BLOCO 6 — Tabelas grandes lidas inteiras (candidatas a índice)
SELECT relname AS tabela, seq_scan, seq_tup_read, idx_scan, n_live_tup AS linhas
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC
LIMIT 15;

-- BLOCO 7 — Índices para as consultas mais frequentes do sistema
CREATE INDEX IF NOT EXISTS idx_account_members_user_status   ON public.account_members (user_id, status);
CREATE INDEX IF NOT EXISTS idx_account_members_owner         ON public.account_members (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner_created           ON public.leads (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_owner      ON public.chat_conversations (owner_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation    ON public.chat_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_owner_created  ON public.search_history (owner_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_responses_owner_resp ON public.campaign_responses (owner_user_id, responded_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_created       ON public.email_logs (user_id, created_at DESC);

-- BLOCO 8 — Tirar do "tempo real" tabelas que não precisam de atualização instantânea
-- (cada tabela aqui gera carga a cada alteração; mantenha só chat e CRM)
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['trial_product_events','wa_flow_executions','calendar_google_sync',
                           'influencer_campaign_recipients','revenue_leads']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_publication_tables
               WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- BLOCO 9 — Ver quem está ocupando conexões agora
SELECT state, left(query, 120) AS consulta, now() - query_start AS tempo
FROM pg_stat_activity
WHERE datname = current_database() AND state <> 'idle'
ORDER BY tempo DESC NULLS LAST
LIMIT 20;
