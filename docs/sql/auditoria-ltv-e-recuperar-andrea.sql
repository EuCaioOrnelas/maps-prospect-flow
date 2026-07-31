-- ============================================================
-- PARTE 1 — AUDITORIA DE LTV (duração real paga por assinante)
-- Não depende de first_paid_at (usa se existir, senão ignora).
-- ============================================================
WITH pagantes AS (
  SELECT
    p.email,
    p.plan,
    p.payment_provider,
    COALESCE(
      NULLIF(to_jsonb(p) ->> 'first_paid_at', '')::timestamptz,
      p.trial_will_charge_at,
      p.created_at + interval '7 days'
    ) AS inicio_pago,
    COALESCE(p.subscription_price_cents, 0) / 100.0 AS valor,
    p.subscription_current_period_end
  FROM public.profiles p
  WHERE p.plan <> 'free'
    AND COALESCE(p.is_blocked, false) = false
    AND (p.trial_will_charge_at IS NULL OR p.trial_will_charge_at <= now())
)
SELECT
  email,
  plan,
  payment_provider,
  inicio_pago::date AS inicio_pago,
  ROUND((EXTRACT(epoch FROM (now() - inicio_pago)) / 2592000.0)::numeric, 2) AS meses_pagos,
  ROUND(valor::numeric, 2) AS valor_mensal,
  subscription_current_period_end::date AS proxima_renovacao
FROM pagantes
WHERE inicio_pago <= now()
ORDER BY meses_pagos DESC;


-- Resumo (compare com o LTV do cockpit)
WITH pagantes AS (
  SELECT
    COALESCE(
      NULLIF(to_jsonb(p) ->> 'first_paid_at', '')::timestamptz,
      p.trial_will_charge_at,
      p.created_at + interval '7 days'
    ) AS inicio_pago,
    COALESCE(p.subscription_price_cents, 0) / 100.0 AS valor
  FROM public.profiles p
  WHERE p.plan <> 'free'
    AND COALESCE(p.is_blocked, false) = false
    AND (p.trial_will_charge_at IS NULL OR p.trial_will_charge_at <= now())
)
SELECT
  COUNT(*) AS assinantes,
  ROUND(AVG(EXTRACT(epoch FROM (now() - inicio_pago)) / 2592000.0)::numeric, 2) AS media_meses_real,
  ROUND(AVG(NULLIF(valor, 0))::numeric, 2) AS ticket_medio,
  ROUND((AVG(EXTRACT(epoch FROM (now() - inicio_pago)) / 2592000.0) * AVG(NULLIF(valor, 0)))::numeric, 2) AS ltv_observado
FROM pagantes
WHERE inicio_pago <= now();


-- ============================================================
-- PARTE 2 — CAÇAR TODO O RASTRO DE andreamoraes05@gmail.com
-- Varre TODAS as tabelas do schema public procurando o e-mail
-- em qualquer coluna. Só leitura, não altera nada.
-- ============================================================
DO $$
DECLARE
  t record;
  alvo text := 'andreamoraes05@gmail.com';
  qtd bigint;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS andrea_rastro (
    tabela text,
    linha  jsonb
  ) ON COMMIT PRESERVE ROWS;
  DELETE FROM andrea_rastro;

  FOR t IN
    SELECT c.relname AS tabela
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format(
      'INSERT INTO andrea_rastro SELECT %L, to_jsonb(x) FROM public.%I x WHERE to_jsonb(x)::text ILIKE %L',
      t.tabela, t.tabela, '%' || alvo || '%'
    );
    GET DIAGNOSTICS qtd = ROW_COUNT;
    IF qtd > 0 THEN
      RAISE NOTICE 'Encontrado em %: % linha(s)', t.tabela, qtd;
    END IF;
  END LOOP;
END $$;

-- Resumo: em quais tabelas ela aparece
SELECT tabela, count(*) AS linhas
FROM andrea_rastro
GROUP BY tabela
ORDER BY linhas DESC;

-- Detalhe completo de cada registro encontrado
SELECT tabela, jsonb_pretty(linha) AS registro
FROM andrea_rastro
ORDER BY tabela;

-- A conta de login pode existir mesmo sem perfil
SELECT id, email, created_at, last_sign_in_at, deleted_at, raw_user_meta_data
FROM auth.users
WHERE lower(email) = 'andreamoraes05@gmail.com';
