-- =====================================================================
-- VERSÃO SEGURA (sem backfill / sem UPDATE em dados)
--
-- O que este script FAZ:
--   1. Cria a coluna-ponte account_members.account_owner_id (GENERATED)
--      somente se ela NÃO existir (não dropa nada)
--   2. Recria accessible_owner_ids() sem array_agg (corrige erro 42809)
--   3. Cria funções de sanitização e triggers ANTES de INSERT/UPDATE
--      nas tabelas de webhook (corrige erro 22P05 Unicode)
--
-- O que este script NÃO FAZ:
--   - Nenhum UPDATE em linhas existentes (sem backfill)
--   - Nenhum DROP de coluna
--   - Não toca em nenhuma outra tabela
--
-- No final ele mostra um RELATÓRIO: se houver linhas de account_members
-- com owner_user_id vazio, você confere e decide se preenche manualmente.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PARTE 1 — Coluna-ponte account_members.account_owner_id
-- ---------------------------------------------------------------------

-- 1.1 Garante que owner_user_id existe (não altera dados, só adiciona
--     a coluna vazia se estiver faltando)
ALTER TABLE public.account_members
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

-- 1.2 Cria a coluna GENERATED apenas se NÃO existir.
--     Se já existir (mesmo gerada), NÃO faz nada — zero risco.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'account_members'
      AND column_name = 'account_owner_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.account_members
      ADD COLUMN account_owner_id uuid GENERATED ALWAYS AS (owner_user_id) STORED';
    RAISE NOTICE 'Coluna account_owner_id criada como GENERATED.';
  ELSE
    RAISE NOTICE 'Coluna account_owner_id já existe — nada a fazer.';
  END IF;
END $$;

-- 1.3 Recria accessible_owner_ids() SEM array_agg (evita erro 42809)
CREATE OR REPLACE FUNCTION public.accessible_owner_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT DISTINCT owner_user_id
    FROM public.account_members
    WHERE owner_user_id IS NOT NULL
      AND (owner_user_id = auth.uid() OR user_id = auth.uid())
  )
$$;

-- ---------------------------------------------------------------------
-- PARTE 2 — Proteção contra "unsupported Unicode escape sequence" (22P05)
-- Os triggers rodam ANTES do INSERT/UPDATE e apenas removem o byte
-- nulo (\u0000) do texto. Não apagam nem alteram nada além disso,
-- e não mexem em linhas já gravadas.
-- ---------------------------------------------------------------------

-- 2.1 Função que remove o byte nulo de um texto
CREATE OR REPLACE FUNCTION public.sanitize_text_input(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_text IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN replace(p_text, E'\u0000', '');
END;
$$;

-- 2.2 Sanitiza jsonb recursivamente (textos dentro de payloads)
CREATE OR REPLACE FUNCTION public.sanitize_jsonb_input(p_json jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_val jsonb;
  v_result jsonb;
BEGIN
  IF p_json IS NULL THEN
    RETURN NULL;
  END IF;

  CASE jsonb_typeof(p_json)
    WHEN 'string' THEN
      RETURN to_jsonb(public.sanitize_text_input(p_json #>> '{}'));
    WHEN 'object' THEN
      v_result := '{}'::jsonb;
      FOR v_key, v_val IN SELECT * FROM jsonb_each(p_json) LOOP
        v_result := v_result || jsonb_build_object(v_key, public.sanitize_jsonb_input(v_val));
      END LOOP;
      RETURN v_result;
    WHEN 'array' THEN
      SELECT COALESCE(jsonb_agg(public.sanitize_jsonb_input(elem)), '[]'::jsonb)
      INTO v_result
      FROM jsonb_array_elements(p_json) AS elem;
      RETURN v_result;
    ELSE
      RETURN p_json;
  END CASE;
END;
$$;

-- 2.3 Trigger genérico para coluna "payload" jsonb
CREATE OR REPLACE FUNCTION public.trg_sanitize_payload()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'meta_webhook_events' AND NEW.payload IS NOT NULL THEN
    NEW.payload := public.sanitize_jsonb_input(NEW.payload);
  ELSIF TG_TABLE_NAME = 'instagram_webhook_events' AND NEW.payload IS NOT NULL THEN
    NEW.payload := public.sanitize_jsonb_input(NEW.payload);
  END IF;
  RETURN NEW;
END;
$$;

-- 2.4 Aplica os triggers apenas se as tabelas/colunas existirem
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='meta_webhook_events')
     AND EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='meta_webhook_events' AND column_name='payload') THEN
    DROP TRIGGER IF EXISTS trg_sanitize_meta_webhook ON public.meta_webhook_events;
    CREATE TRIGGER trg_sanitize_meta_webhook
      BEFORE INSERT OR UPDATE ON public.meta_webhook_events
      FOR EACH ROW EXECUTE FUNCTION public.trg_sanitize_payload();
    RAISE NOTICE 'Trigger de sanitização criado em meta_webhook_events.';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='instagram_webhook_events')
     AND EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='instagram_webhook_events' AND column_name='payload') THEN
    DROP TRIGGER IF EXISTS trg_sanitize_ig_webhook ON public.instagram_webhook_events;
    CREATE TRIGGER trg_sanitize_ig_webhook
      BEFORE INSERT OR UPDATE ON public.instagram_webhook_events
      FOR EACH ROW EXECUTE FUNCTION public.trg_sanitize_payload();
    RAISE NOTICE 'Trigger de sanitização criado em instagram_webhook_events.';
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- RELATÓRIO FINAL (somente leitura)
-- ---------------------------------------------------------------------
SELECT '1_coluna_account_owner_id' AS item,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='account_members'
           AND column_name='account_owner_id'
       ) THEN 'OK' ELSE 'FALTANDO' END AS status,
       COALESCE((
         SELECT 'is_generated=' || is_generated
         FROM information_schema.columns
         WHERE table_schema='public' AND table_name='account_members'
           AND column_name='account_owner_id'
       ), '-') AS detalhe
UNION ALL
SELECT '2_funcao_accessible_owner_ids',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public' AND p.proname='accessible_owner_ids'
       ) THEN 'OK' ELSE 'FALTANDO' END, '-'
UNION ALL
SELECT '3_trigger_meta_webhook',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_sanitize_meta_webhook')
            THEN 'OK' ELSE 'N/A (tabela ausente)' END, '-'
UNION ALL
SELECT '4_trigger_instagram_webhook',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_sanitize_ig_webhook')
            THEN 'OK' ELSE 'N/A (tabela ausente)' END, '-'
UNION ALL
SELECT '5_linhas_sem_owner_user_id',
       CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'REVISAR' END,
       COUNT(*)::text || ' linha(s) com owner_user_id NULL em account_members'
FROM public.account_members
WHERE owner_user_id IS NULL;
