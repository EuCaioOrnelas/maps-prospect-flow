-- 1) Novos tipos de nós (canal Instagram)
ALTER TYPE public.wa_flow_node_type ADD VALUE IF NOT EXISTS 'instagram_entry';
ALTER TYPE public.wa_flow_node_type ADD VALUE IF NOT EXISTS 'ig_reply_comment';
ALTER TYPE public.wa_flow_node_type ADD VALUE IF NOT EXISTS 'ig_send_dm';

-- 2) Canal no fluxo
ALTER TABLE public.wa_automation_flows
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS instagram_connection_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wa_automation_flows_channel_check') THEN
    ALTER TABLE public.wa_automation_flows
      ADD CONSTRAINT wa_automation_flows_channel_check CHECK (channel IN ('whatsapp','instagram'));
  END IF;
END $$;

-- 3) Contexto de execução multicanal
ALTER TABLE public.wa_flow_executions
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS contact_ref text,
  ADD COLUMN IF NOT EXISTS thread_ref text,
  ADD COLUMN IF NOT EXISTS trigger_type text,
  ADD COLUMN IF NOT EXISTS trigger_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS channel_account_id uuid;

CREATE INDEX IF NOT EXISTS idx_wa_flow_executions_channel_contact
  ON public.wa_flow_executions (owner_user_id, channel, contact_ref);

-- 4) Contas Instagram conectadas
CREATE TABLE IF NOT EXISTS public.user_instagram_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  ig_user_id text NOT NULL,
  ig_username text,
  ig_name text,
  profile_picture_url text,
  page_id text,
  page_name text,
  access_token text NOT NULL,
  token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  last_error text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_instagram_conn_owner_iguser
  ON public.user_instagram_connections (owner_user_id, ig_user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_conn_iguser
  ON public.user_instagram_connections (ig_user_id);

-- Token nunca legível pelo cliente: grants por coluna
GRANT SELECT (id, user_id, owner_user_id, ig_user_id, ig_username, ig_name,
              profile_picture_url, page_id, page_name, token_expires_at, status,
              last_error, last_checked_at, created_at, updated_at)
  ON public.user_instagram_connections TO authenticated;
GRANT DELETE ON public.user_instagram_connections TO authenticated;
GRANT ALL ON public.user_instagram_connections TO service_role;

ALTER TABLE public.user_instagram_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ig_conn_select_own_account" ON public.user_instagram_connections;
CREATE POLICY "ig_conn_select_own_account"
  ON public.user_instagram_connections FOR SELECT TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()));

DROP POLICY IF EXISTS "ig_conn_delete_own_account" ON public.user_instagram_connections;
CREATE POLICY "ig_conn_delete_own_account"
  ON public.user_instagram_connections FOR DELETE TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()));

-- Limite de 2 contas por tenant (backend, não só UI)
CREATE OR REPLACE FUNCTION public.enforce_instagram_connection_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
BEGIN
  SELECT count(*) INTO total
  FROM public.user_instagram_connections
  WHERE owner_user_id = NEW.owner_user_id
    AND (TG_OP = 'INSERT' OR id <> NEW.id);
  IF total >= 2 THEN
    RAISE EXCEPTION 'instagram_connection_limit_reached';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_instagram_connection_limit ON public.user_instagram_connections;
CREATE TRIGGER trg_instagram_connection_limit
  BEFORE INSERT ON public.user_instagram_connections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_instagram_connection_limit();

DROP TRIGGER IF EXISTS trg_instagram_connection_updated_at ON public.user_instagram_connections;
CREATE TRIGGER trg_instagram_connection_updated_at
  BEFORE UPDATE ON public.user_instagram_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Eventos brutos do Instagram (dedup + auditoria)
CREATE TABLE IF NOT EXISTS public.instagram_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.user_instagram_connections(id) ON DELETE SET NULL,
  owner_user_id uuid,
  ig_user_id text,
  event_type text NOT NULL,
  external_id text,
  sender_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ig_event_external
  ON public.instagram_webhook_events (event_type, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ig_events_owner ON public.instagram_webhook_events (owner_user_id, created_at DESC);

GRANT SELECT ON public.instagram_webhook_events TO authenticated;
GRANT ALL ON public.instagram_webhook_events TO service_role;

ALTER TABLE public.instagram_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ig_events_select_own_account" ON public.instagram_webhook_events;
CREATE POLICY "ig_events_select_own_account"
  ON public.instagram_webhook_events FOR SELECT TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()));