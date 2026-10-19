-- ============================================================
-- QUEM ESTÁ USANDO A CPU AGORA (somente leitura)
-- Rode inteiro, de uma vez, ENQUANTO a CPU estiver alta.
-- Copie o resultado inteiro e envie no chat.
-- ============================================================

SELECT '1_conexoes_por_origem' AS secao,
       COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'total')::int DESC) FROM (
         SELECT jsonb_build_object(
           'usuario', usename,
           'app', COALESCE(NULLIF(application_name, ''), '-'),
           'estado', state,
           'total', count(*),
           'mais_antiga_seg', round(extract(epoch FROM max(now() - query_start))::numeric)) AS x
         FROM pg_stat_activity
         WHERE datname = current_database()
         GROUP BY usename, application_name, state) s), '[]'::jsonb) AS dados

UNION ALL
SELECT '2_consultas_rodando_agora',
       COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'qtd')::int DESC) FROM (
         SELECT jsonb_build_object(
           'qtd', count(*),
           'usuario', usename,
           'espera', COALESCE(wait_event_type || ':' || wait_event, 'CPU'),
           'seg_max', round(extract(epoch FROM max(now() - query_start))::numeric, 1),
           'consulta', left(regexp_replace(query, '\s+', ' ', 'g'), 220)) AS x
         FROM pg_stat_activity
         WHERE datname = current_database()
           AND state = 'active'
           AND pid <> pg_backend_pid()
         GROUP BY usename, wait_event_type, wait_event, left(regexp_replace(query, '\s+', ' ', 'g'), 220)
         LIMIT 25) s), '[]'::jsonb)

UNION ALL
SELECT '3_consultas_mais_chamadas',
       COALESCE((SELECT jsonb_agg(x) FROM (
         SELECT jsonb_build_object(
           'chamadas', calls,
           'ms_total', round(total_exec_time::numeric),
           'ms_media', round(mean_exec_time::numeric, 1),
           'linhas', rows,
           'consulta', left(regexp_replace(query, '\s+', ' ', 'g'), 220)) AS x
         FROM pg_stat_statements
         ORDER BY calls DESC
         LIMIT 20) s), '[]'::jsonb)

UNION ALL
SELECT '4_consultas_mais_pesadas',
       COALESCE((SELECT jsonb_agg(x) FROM (
         SELECT jsonb_build_object(
           'ms_total', round(total_exec_time::numeric),
           'chamadas', calls,
           'ms_media', round(mean_exec_time::numeric, 1),
           'consulta', left(regexp_replace(query, '\s+', ' ', 'g'), 220)) AS x
         FROM pg_stat_statements
         ORDER BY total_exec_time DESC
         LIMIT 20) s), '[]'::jsonb)

UNION ALL
SELECT '5_tabelas_mais_alteradas',
       COALESCE((SELECT jsonb_agg(x) FROM (
         SELECT jsonb_build_object(
           'tabela', relname,
           'inseridas', n_tup_ins, 'atualizadas', n_tup_upd, 'apagadas', n_tup_del,
           'leituras_completas', seq_scan, 'linhas_lidas', seq_tup_read) AS x
         FROM pg_stat_user_tables
         ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
         LIMIT 15) s), '[]'::jsonb)

UNION ALL
SELECT '6_estatisticas_desde',
       jsonb_build_object(
         'consultas_contadas_desde', (SELECT stats_reset FROM pg_stat_statements_info),
         'banco_ligado_desde', pg_postmaster_start_time());
