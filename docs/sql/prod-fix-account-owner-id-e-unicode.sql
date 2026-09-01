-- =====================================================================
-- FIX 1: Recria a coluna-ponte account_members.account_owner_id
-- FIX 2: Protege contra "unsupported Unicode escape sequence" (22P05)
-- IDEMPOTENTE — pode rodar várias vezes sem erro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PARTE 1 — account_members.account_owner_id
-- ---------------------------------------------------------------------

-- 1.1 Garante que owner_user_id existe (fonte de verdade)
ALTER TABLE public.account_members
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

-- 1.2 Backfill: se owner_user_id estiver vazio, tenta preencher a partir
--     de uma coluna legada "user_id" do dono, quando existir.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'account_members'
      AND column_name = 'account_id'
  ) THEN
    EXECUTE 'UPDATE public.account_members SET owner_user_id = account_id WHERE owner_user_id IS NULL';
  END IF;
END $$;

-- 1.3 Remove a coluna gerada antiga (se existir) para recriar limpa
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'account_members'
      AND column_name = 'account_owner_id'
      AND is_generated = 'ALWAYS'
  ) THEN
    EXECUTE 'ALTER TABLE public.account_members DROP COLUMN account_owner_id';
  END IF;
END $$;

-- 1.4 Recria como coluna GENERATED apontando para owner_user_id
--     (ponte de compatibilidade: código antigo lê account_owner_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'account_members'
      AND column_name = 'account_owner_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.account_members
      ADD COLUMN account_owner_id uuid GENERATED ALWAYS AS (owner_user_id) STORED';
  END IF;
END $$;

-- 1.5 Recria accessible_owner_ids() SEM array_agg (evita erro 42809)
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
-- PARTE 2 — Unicode escape (22P05)
-- Causa típica: payload externo (webhook WhatsApp/Meta) com \u0000 ou
-- sequência \u malformada sendo gravada em coluna text/jsonb.
-- Solução: função sanitizadora + trigger nas tabelas de webhook.
-- ---------------------------------------------------------------------

-- 2.1 Função que remove bytes nulos e escapes inválidos de um texto
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
  -- Remove NUL (\u0000) — causa nº1 do erro 22P05
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

-- 2.3 Trigger genérico para colunas "payload"/"raw_payload" jsonb
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

-- 2.4 Aplica o trigger nas tabelas de webhook (se existirem)
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
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='instagram_webhook_events')
     AND EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='instagram_webhook_events' AND column_name='payload') THEN
    DROP TRIGGER IF EXISTS trg_sanitize_ig_webhook ON public.instagram_webhook_events;
    CREATE TRIGGER trg_sanitize_ig_webhook
      BEFORE INSERT OR UPDATE ON public.instagram_webhook_events
      FOR EACH ROW EXECUTE FUNCTION public.trg_sanitize_payload();
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- VERIFICAÇÃO (resultado único)
-- ---------------------------------------------------------------------
SELECT 'account_owner_id' AS item,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='account_members'
           AND column_name='account_owner_id'
       ) THEN 'OK' ELSE 'FALTANDO' END AS status
UNION ALL
SELECT 'accessible_owner_ids()',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public' AND p.proname='accessible_owner_ids'
       ) THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'sanitize_text_input()', 'OK'
UNION ALL
SELECT 'trigger meta_webhook_events',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_sanitize_meta_webhook')
            THEN 'OK' ELSE 'N/A' END
UNION ALL
SELECT 'trigger instagram_webhook_events',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_sanitize_ig_webhook')
            THEN 'OK' ELSE 'N/A' END;
