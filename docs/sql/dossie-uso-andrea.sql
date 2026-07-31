-- ============================================================
-- DOSSIÊ DE USO — Andrea (DEDA CONSTANTINO)
-- user_id: 77b33b64-b24a-4a5c-9894-5c1798cb0ee8
-- Só leitura. Rode bloco por bloco.
-- ============================================================

-- 1) Onde ela aparece: varre TODAS as tabelas do public que tenham
--    uma coluna user_id / owner_id / created_by / profile_id / id
DO $$
DECLARE
  t record;
  alvo uuid := '77b33b64-b24a-4a5c-9894-5c1798cb0ee8';
  qtd bigint;
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
      GET DIAGNOSTICS qtd = ROW_COUNT;
      IF qtd > 0 THEN
        RAISE NOTICE '% (%): % linha(s)', t.table_name, t.column_name, qtd;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- ignora tabelas sem permissão
    END;
  END LOOP;
END $$;

-- Resumo: quantos registros ela gerou em cada tabela
SELECT tabela, coluna, count(*) AS registros
FROM andrea_uso
GROUP BY tabela, coluna
ORDER BY registros DESC;


-- 2) Perfil dela (plano, consumo de buscas, trial, pagamento)
SELECT jsonb_pretty(to_jsonb(p))
FROM public.profiles p
WHERE p.id = '77b33b64-b24a-4a5c-9894-5c1798cb0ee8';


-- 3) Linha do tempo de uso: primeira e última atividade por tabela
SELECT
  tabela,
  count(*) AS eventos,
  min(NULLIF(linha ->> 'created_at','')::timestamptz) AS primeiro,
  max(NULLIF(linha ->> 'created_at','')::timestamptz) AS ultimo,
  ROUND(EXTRACT(epoch FROM (
    max(NULLIF(linha ->> 'created_at','')::timestamptz)
    - min(NULLIF(linha ->> 'created_at','')::timestamptz)
  )) / 86400.0, 2) AS dias_de_uso
FROM andrea_uso
WHERE linha ? 'created_at'
GROUP BY tabela
ORDER BY eventos DESC;


-- 4) Tempo total de uso da conta (do primeiro ao último evento de tudo)
SELECT
  min(NULLIF(linha ->> 'created_at','')::timestamptz) AS primeira_atividade,
  max(NULLIF(linha ->> 'created_at','')::timestamptz) AS ultima_atividade,
  ROUND(EXTRACT(epoch FROM (
    max(NULLIF(linha ->> 'created_at','')::timestamptz)
    - min(NULLIF(linha ->> 'created_at','')::timestamptz)
  )) / 86400.0, 2) AS dias_entre_1a_e_ultima,
  count(*) AS total_registros
FROM andrea_uso
WHERE linha ? 'created_at';


-- 5) Buscas / prospecção feitas
SELECT jsonb_pretty(linha)
FROM andrea_uso
WHERE tabela IN ('search_history','leads','user_events','ai_logs','ai_usage_logs')
ORDER BY tabela, (linha ->> 'created_at');

-- Contagem rápida das ações principais
SELECT
  (SELECT count(*) FROM andrea_uso WHERE tabela = 'search_history')      AS buscas,
  (SELECT count(*) FROM andrea_uso WHERE tabela = 'leads')               AS leads_gerados,
  (SELECT count(*) FROM andrea_uso WHERE tabela = 'whatsapp_campaigns')  AS campanhas,
  (SELECT count(*) FROM andrea_uso WHERE tabela = 'chat_messages')       AS mensagens_chat,
  (SELECT count(*) FROM andrea_uso WHERE tabela = 'wa_automation_flows') AS fluxos,
  (SELECT count(*) FROM andrea_uso WHERE tabela = 'ai_agents')           AS agentes_ia,
  (SELECT count(*) FROM andrea_uso WHERE tabela = 'user_events')         AS eventos_navegacao;


-- 6) Sessões reais (dias que ela realmente abriu o sistema)
SELECT
  (NULLIF(linha ->> 'created_at','')::timestamptz)::date AS dia,
  count(*) AS acoes,
  min(NULLIF(linha ->> 'created_at','')::timestamptz)    AS inicio,
  max(NULLIF(linha ->> 'created_at','')::timestamptz)    AS fim,
  ROUND(EXTRACT(epoch FROM (
    max(NULLIF(linha ->> 'created_at','')::timestamptz)
    - min(NULLIF(linha ->> 'created_at','')::timestamptz)
  )) / 60.0, 1) AS minutos_ativos
FROM andrea_uso
WHERE linha ? 'created_at'
GROUP BY 1
ORDER BY dia;


-- 7) Pagamentos, cobranças e cancelamento (o caso do reembolso)
SELECT tabela, jsonb_pretty(linha)
FROM andrea_uso
WHERE tabela IN (
  'pix_invoices','custom_subscriptions','custom_subscription_payments',
  'subscription_events','subscription_cancellations','subscription_upgrades',
  'checkout_leads','cancellation_feedback','coupon_redemptions','email_logs'
)
ORDER BY tabela, (linha ->> 'created_at');
