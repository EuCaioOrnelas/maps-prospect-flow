-- ============================================================
-- DIAGNÓSTICO ÚNICO DO BANCO DE PRODUÇÃO (somente leitura)
-- Rode tudo de uma vez. Retorna uma tabela com 6 linhas (uma por assunto).
-- Copie o resultado inteiro e envie no chat.
-- ============================================================

SELECT '1_agendamentos' AS secao,
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'nome', jobname, 'frequencia', schedule, 'ativo', active) ORDER BY jobname)
        FROM cron.job), '[]'::jsonb) AS dados

UNION ALL
SELECT '2_agendamentos_24h',
       COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'execucoes')::int DESC) FROM (
         SELECT jsonb_build_object(
           'nome', j.jobname,
           'execucoes', count(*),
           'falhas', count(*) FILTER (WHERE d.status <> 'succeeded'),
           'segundos_medios', round(avg(extract(epoch FROM d.end_time - d.start_time))::numeric, 1)
         ) AS x
         FROM cron.job_run_details d
         JOIN cron.job j ON j.jobid = d.jobid
         WHERE d.start_time > now() - interval '24 hours'
         GROUP BY j.jobname) s), '[]'::jsonb)

UNION ALL
SELECT '3_consultas_pesadas',
       COALESCE((SELECT jsonb_agg(x) FROM (
         SELECT jsonb_build_object(
           'ms_total', round(total_exec_time::numeric),
           'chamadas', calls,
           'ms_media', round(mean_exec_time::numeric, 1),
           'consulta', left(query, 160)) AS x
         FROM pg_stat_statements
         ORDER BY total_exec_time DESC
         LIMIT 15) s), '[]'::jsonb)

UNION ALL
SELECT '4_tabelas_lidas_inteiras',
       COALESCE((SELECT jsonb_agg(x) FROM (
         SELECT jsonb_build_object(
           'tabela', relname, 'leituras_completas', seq_scan,
           'linhas_lidas', seq_tup_read, 'uso_indice', idx_scan,
           'linhas', n_live_tup) AS x
         FROM pg_stat_user_tables
         ORDER BY seq_tup_read DESC
         LIMIT 15) s), '[]'::jsonb)

UNION ALL
SELECT '5_tempo_real',
       COALESCE((SELECT jsonb_agg(tablename ORDER BY tablename)
        FROM pg_publication_tables WHERE pubname = 'supabase_realtime'), '[]'::jsonb)

UNION ALL
SELECT '6_conferencia',
       jsonb_build_object(
         'colunas_email_ok', (SELECT count(*) FROM information_schema.columns
            WHERE table_schema='public' AND table_name='email_logs'
              AND column_name IN ('opened_at','opened_count','clicked_at','clicked_count')) = 4,
         'indices_criados', (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN (
            'idx_account_members_user_status','idx_account_members_owner','idx_leads_owner_created',
            'idx_chat_conversations_owner','idx_chat_messages_conversation','idx_search_history_owner_created',
            'idx_campaign_responses_owner_resp','idx_email_logs_user_created')),
         'historico_agendamentos_linhas', (SELECT count(*) FROM cron.job_run_details),
         'conexoes_ativas', (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND state <> 'idle'),
         'tamanho_banco', pg_size_pretty(pg_database_size(current_database()))
       );
