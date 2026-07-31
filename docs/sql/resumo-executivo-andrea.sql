-- ============================================================
-- RESUMO EXECUTIVO DE USO — Andrea (DEDA CONSTANTINO)
-- user_id: 77b33b64-b24a-4a5c-9894-5c1798cb0ee8
-- Só leitura. Saída ÚNICA (uma tabela): buscas, leads, sessões/dia.
-- Rode o arquivo inteiro de uma vez no SQL Editor de produção.
-- ============================================================

-- Passo 1: coleta tudo que é dela (recria a temp table)
DO $$
DECLARE
  t     record;
  alvo  uuid := '77b33b64-b24a-4a5c-9894-5c1798cb0ee8';
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS andrea_uso (
    tabela text,
    coluna text,
    linha  jsonb
  ) ON COMMIT PRESERVE ROWS;
  DELETE FROM andrea_uso;

  FOR t IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND tb.table_type = 'BASE TABLE'
      AND c.data_type = 'uuid'
      AND c.column_name IN ('user_id','owner_id','created_by','profile_id','account_owner_id','id')
  LOOP
    BEGIN
      EXECUTE format(
        'INSERT INTO andrea_uso SELECT %L, %L, to_jsonb(x) FROM public.%I x WHERE x.%I = %L',
        t.table_name, t.column_name, t.table_name, t.column_name, alvo
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- Passo 2: SAÍDA ÚNICA
WITH base AS (
  SELECT DISTINCT
    tabela,
    linha,
    NULLIF(linha ->> 'created_at','')::timestamptz AS ts
  FROM andrea_uso
  WHERE linha ? 'created_at'
    AND NULLIF(linha ->> 'created_at','') IS NOT NULL
),
marcado AS (
  SELECT
    ts,
    tabela,
    -- rotina automática = job diário (~03:00 UTC) em tabelas de sistema/cota
    CASE
      WHEN tabela IN ('usage_limits','usage_resets','user_usage','daily_usage','subscription_events','profiles')
           AND ts::time BETWEEN time '02:55' AND time '03:10'
      THEN false
      ELSE true
    END AS acao_humana
  FROM base
),
por_dia AS (
  SELECT
    ts::date                                                   AS dia,
    count(*) FILTER (WHERE acao_humana)                        AS acoes_reais,
    count(*)                                                   AS acoes_totais,
    min(ts) FILTER (WHERE acao_humana)                         AS inicio,
    max(ts) FILTER (WHERE acao_humana)                         AS fim,
    ROUND(EXTRACT(epoch FROM (
      max(ts) FILTER (WHERE acao_humana) - min(ts) FILTER (WHERE acao_humana)
    )) / 60.0, 1)                                              AS minutos_sessao,
    count(*) FILTER (WHERE tabela IN ('search_history','searches','lead_searches')) AS buscas,
    count(*) FILTER (WHERE tabela IN ('leads','opportunities','crm_leads'))         AS leads
  FROM marcado
  GROUP BY 1
),
dias_uteis AS (
  SELECT * FROM por_dia WHERE acoes_reais > 0
)
SELECT
  0                                                AS ord,
  to_char(dia, 'DD/MM/YYYY')                       AS dia,
  acoes_reais                                      AS acoes,
  buscas,
  leads,
  to_char(inicio, 'HH24:MI')                       AS inicio,
  to_char(fim, 'HH24:MI')                          AS fim,
  COALESCE(minutos_sessao, 0)                      AS minutos_sessao
FROM dias_uteis

UNION ALL

SELECT
  1,
  '── TOTAL ──',
  (SELECT COALESCE(sum(acoes_reais), 0) FROM dias_uteis),
  (SELECT COALESCE(sum(buscas), 0)      FROM dias_uteis),
  (SELECT COALESCE(sum(leads), 0)       FROM dias_uteis),
  (SELECT to_char(min(inicio), 'DD/MM') FROM dias_uteis),
  (SELECT to_char(max(fim), 'DD/MM')    FROM dias_uteis),
  (SELECT COALESCE(sum(minutos_sessao), 0) FROM dias_uteis)

ORDER BY ord, dia;
