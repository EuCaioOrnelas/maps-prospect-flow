-- =============================================================
-- MÓDULO SEGURO DE EXPORTAÇÃO E PREPARAÇÃO PARA WIIZE PAY
-- Migration idempotente (pode ser executada novamente).
-- O bucket privado integration-exports é criado pela Storage API.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabelas

-- Senha de Integração (hash PBKDF2 + salt; NUNCA em texto puro)
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE DEFAULT public.current_account_owner(),
  password_hash text,
  password_set_at timestamptz,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Configuração/mapeamento de exportação por conta
CREATE TABLE IF NOT EXISTS public.integration_export_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE DEFAULT public.current_account_owner(),
  preset text NOT NULL DEFAULT 'wiize_pay_minimo',
  entity_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Solicitações de exportação (fluxo assíncrono)
CREATE TABLE IF NOT EXISTS public.integration_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL DEFAULT public.current_account_owner(),
  created_by uuid NOT NULL,
  idempotency_key text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','authorized','processing','completed','failed','expired','cancelled')),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_counts jsonb,
  file_path text,
  file_size bigint,
  checksum text,
  manifest jsonb,
  confirmation_method text,
  error_message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, idempotency_key)
);

-- Tokens de confirmação por e-mail (uso único, expiram, hash-only)
CREATE TABLE IF NOT EXISTS public.integration_export_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL DEFAULT public.current_account_owner(),
  request_id uuid NOT NULL REFERENCES public.integration_export_requests(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'confirm_export',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auditoria específica do módulo (sem senhas/tokens/secrets)
CREATE TABLE IF NOT EXISTS public.integration_export_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL DEFAULT public.current_account_owner(),
  request_id uuid,
  user_id uuid,
  action text NOT NULL,
  method text,
  ip inet,
  user_agent text,
  scope jsonb,
  record_count integer,
  status text,
  error_message text,
  auth_method text,
  email_sent boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Conexões de integração — READY_FOR_WIIZE_PAY
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE DEFAULT public.current_account_owner(),
  provider text NOT NULL DEFAULT 'wiize_pay',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','revoked','expired','error')),
  scopes jsonb,
  last_sync_at timestamptz,
  sync_status text,
  sync_cursor text,
  sync_version integer,
  last_error text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. GRANTs
GRANT ALL ON public.integration_settings TO service_role;
GRANT SELECT (id, owner_user_id, password_set_at, failed_attempts, locked_until, updated_at)
  ON public.integration_settings TO authenticated;

GRANT ALL ON public.integration_export_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_export_configs TO authenticated;

GRANT ALL ON public.integration_export_requests TO service_role;
GRANT SELECT ON public.integration_export_requests TO authenticated;

GRANT ALL ON public.integration_export_tokens TO service_role;

GRANT ALL ON public.integration_export_audit_logs TO service_role;
GRANT SELECT ON public.integration_export_audit_logs TO authenticated;

GRANT ALL ON public.integration_connections TO service_role;
GRANT SELECT ON public.integration_connections TO authenticated;

-- 3. RLS
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_export_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_export_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_export_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integration_settings view" ON public.integration_settings;
CREATE POLICY "integration_settings view" ON public.integration_settings
  FOR SELECT TO authenticated
  USING (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "integration_export_configs member" ON public.integration_export_configs;
CREATE POLICY "integration_export_configs member" ON public.integration_export_configs
  FOR ALL TO authenticated
  USING (public.is_account_member(owner_user_id))
  WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())));

DROP POLICY IF EXISTS "integration_export_requests view" ON public.integration_export_requests;
CREATE POLICY "integration_export_requests view" ON public.integration_export_requests
  FOR SELECT TO authenticated
  USING (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "integration_export_audit view" ON public.integration_export_audit_logs;
CREATE POLICY "integration_export_audit view" ON public.integration_export_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "integration_connections view" ON public.integration_connections;
CREATE POLICY "integration_connections view" ON public.integration_connections
  FOR SELECT TO authenticated
  USING (public.is_account_member(owner_user_id));

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_integration_export_requests_owner
  ON public.integration_export_requests (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_export_requests_status
  ON public.integration_export_requests (status, created_at);
CREATE INDEX IF NOT EXISTS idx_integration_export_tokens_request
  ON public.integration_export_tokens (request_id);
CREATE INDEX IF NOT EXISTS idx_integration_export_audit_owner
  ON public.integration_export_audit_logs (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_export_audit_request
  ON public.integration_export_audit_logs (request_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_owner
  ON public.integration_connections (owner_user_id, provider);

-- 5. Token de cron + agendamento do processador (a cada 5 min)
INSERT INTO public.internal_cron_tokens (name, token)
VALUES ('integration-export-processor', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_token text;
BEGIN
  SELECT token INTO v_token FROM public.internal_cron_tokens WHERE name = 'integration-export-processor';
  IF v_token IS NULL THEN RETURN; END IF;

  PERFORM cron.unschedule('integration-export-processor')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'integration-export-processor');

  EXECUTE format(
    'SELECT cron.schedule(''integration-export-processor'', ''*/5 * * * *'', $c$SELECT net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'', ''application/json'', ''x-cron-secret'', %L), body := ''{"source":"cron"}''::jsonb);$c$);',
    'https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/integration-export-processor',
    v_token
  );
END $$;

SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'integration-export-processor';