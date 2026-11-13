-- Wiize ChatWeb — rodar na produção (uma vez). Depois crie o bucket privado 'chatweb-avatars' (1 MB) no armazenamento
-- e publique as funções chatweb-api e wa-flow-runner.
CREATE TABLE public.chatweb_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  user_id uuid NOT NULL,
  flow_id uuid NOT NULL UNIQUE REFERENCES public.wa_automation_flows(id) ON DELETE CASCADE,
  slug text NOT NULL,
  display_name text NOT NULL DEFAULT 'Atendimento',
  description text,
  avatar_path text,
  theme_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  widget_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  welcome_message text,
  input_placeholder text DEFAULT 'Digite sua mensagem...',
  enabled boolean NOT NULL DEFAULT true,
  embed_mode text NOT NULL DEFAULT 'both',
  allowed_domains text[] NOT NULL DEFAULT '{}',
  session_ttl_minutes integer NOT NULL DEFAULT 1440,
  disable_policy text NOT NULL DEFAULT 'keep_open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chatweb_slug_format CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'),
  CONSTRAINT chatweb_embed_mode CHECK (embed_mode IN ('both','inline','widget')),
  CONSTRAINT chatweb_disable_policy CHECK (disable_policy IN ('keep_open','close')),
  CONSTRAINT chatweb_ttl CHECK (session_ttl_minutes BETWEEN 15 AND 43200)
);
CREATE UNIQUE INDEX chatweb_configurations_slug_key ON public.chatweb_configurations (slug);
CREATE INDEX chatweb_configurations_owner_idx ON public.chatweb_configurations (owner_user_id);

CREATE TABLE public.chatweb_slug_history (
  slug text PRIMARY KEY,
  config_id uuid REFERENCES public.chatweb_configurations(id) ON DELETE SET NULL,
  retired_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chatweb_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.chatweb_configurations(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  flow_id uuid NOT NULL,
  visitor_id text NOT NULL,
  session_token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  lead_id uuid,
  execution_id uuid,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  origin text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  CONSTRAINT chatweb_session_status CHECK (status IN ('active','completed','abandoned','handoff','closed'))
);
CREATE INDEX chatweb_sessions_config_idx ON public.chatweb_sessions (config_id, started_at DESC);
CREATE INDEX chatweb_sessions_owner_idx ON public.chatweb_sessions (owner_user_id);

CREATE TABLE public.chatweb_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chatweb_sessions(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  sender_type text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chatweb_sender CHECK (sender_type IN ('visitor','bot','agent','system'))
);
CREATE INDEX chatweb_messages_session_idx ON public.chatweb_messages (session_id, created_at);

ALTER TABLE public.wa_flow_executions ADD COLUMN IF NOT EXISTS chatweb_session_id uuid;
CREATE INDEX IF NOT EXISTS wa_flow_executions_chatweb_idx ON public.wa_flow_executions (chatweb_session_id) WHERE chatweb_session_id IS NOT NULL;
ALTER TABLE public.ai_usage_logs ADD COLUMN IF NOT EXISTS channel text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatweb_configurations TO authenticated;
GRANT SELECT ON public.chatweb_sessions, public.chatweb_messages, public.chatweb_slug_history TO authenticated;
GRANT ALL ON public.chatweb_configurations, public.chatweb_sessions, public.chatweb_messages, public.chatweb_slug_history TO service_role;

ALTER TABLE public.chatweb_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatweb_slug_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatweb_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatweb_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chatweb_cfg_select ON public.chatweb_configurations FOR SELECT TO authenticated USING (public.is_account_member(owner_user_id));
CREATE POLICY chatweb_cfg_insert ON public.chatweb_configurations FOR INSERT TO authenticated
  WITH CHECK (public.is_account_member(owner_user_id) AND EXISTS (
    SELECT 1 FROM public.wa_automation_flows f WHERE f.id = flow_id AND COALESCE(f.owner_user_id, f.user_id) = owner_user_id));
CREATE POLICY chatweb_cfg_update ON public.chatweb_configurations FOR UPDATE TO authenticated
  USING (public.is_account_member(owner_user_id)) WITH CHECK (public.is_account_member(owner_user_id));
CREATE POLICY chatweb_cfg_delete ON public.chatweb_configurations FOR DELETE TO authenticated USING (public.is_account_member(owner_user_id));
CREATE POLICY chatweb_slug_hist_select ON public.chatweb_slug_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chatweb_configurations c WHERE c.id = config_id AND public.is_account_member(c.owner_user_id)));
CREATE POLICY chatweb_sessions_select ON public.chatweb_sessions FOR SELECT TO authenticated USING (public.is_account_member(owner_user_id));
CREATE POLICY chatweb_messages_select ON public.chatweb_messages FOR SELECT TO authenticated USING (public.is_account_member(owner_user_id));

CREATE OR REPLACE FUNCTION public.chatweb_reserved_slug(_slug text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _slug = ANY (ARRAY['admin','api','app','www','wiize','suporte-wiize','login','auth','dashboard','chat','chatweb','c','embed','widget','static','assets','help','ajuda','status','null','undefined','root','sistema','oficial','wiizepay'])
$$;

CREATE OR REPLACE FUNCTION public.chatweb_slug_available(_slug text, _config_id uuid DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'
    AND NOT public.chatweb_reserved_slug(_slug)
    AND NOT EXISTS (SELECT 1 FROM public.chatweb_configurations c WHERE c.slug = _slug AND c.id IS DISTINCT FROM _config_id)
    AND NOT EXISTS (SELECT 1 FROM public.chatweb_slug_history h WHERE h.slug = _slug AND h.config_id IS DISTINCT FROM _config_id)
$$;
REVOKE ALL ON FUNCTION public.chatweb_slug_available(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chatweb_slug_available(text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.chatweb_config_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.slug := lower(NEW.slug);
  IF TG_OP = 'UPDATE' THEN
    NEW.owner_user_id := OLD.owner_user_id;
    NEW.flow_id := OLD.flow_id;
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.slug IS DISTINCT FROM OLD.slug) THEN
    IF public.chatweb_reserved_slug(NEW.slug) THEN
      RAISE EXCEPTION 'chatweb_slug_reserved' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM public.chatweb_slug_history h WHERE h.slug = NEW.slug AND h.config_id IS DISTINCT FROM NEW.id) THEN
      RAISE EXCEPTION 'chatweb_slug_taken' USING ERRCODE = '23505';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    INSERT INTO public.chatweb_slug_history (slug, config_id) VALUES (OLD.slug, OLD.id)
    ON CONFLICT (slug) DO NOTHING;
    DELETE FROM public.chatweb_slug_history WHERE slug = NEW.slug AND config_id = NEW.id;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.enabled AND NOT NEW.enabled AND NEW.disable_policy = 'close' THEN
    UPDATE public.chatweb_sessions SET status = 'closed', ended_at = now()
     WHERE config_id = NEW.id AND status IN ('active','handoff');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER chatweb_config_guard BEFORE INSERT OR UPDATE ON public.chatweb_configurations
  FOR EACH ROW EXECUTE FUNCTION public.chatweb_config_guard();

CREATE OR REPLACE FUNCTION public.chatweb_flow_stats(_owner uuid, _from timestamptz, _to timestamptz)
RETURNS TABLE (flow_id uuid, channel text, sessions bigint, completed bigint, abandoned bigint, in_progress bigint, leads bigint, avg_seconds numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.flow_id, COALESCE(e.channel,'whatsapp'), count(*),
    count(*) FILTER (WHERE e.status = 'completed'),
    count(*) FILTER (WHERE e.status IN ('abandoned','failed')),
    count(*) FILTER (WHERE e.status IN ('active','running','waiting','awaiting_input')),
    count(DISTINCT s.lead_id) FILTER (WHERE s.lead_id IS NOT NULL),
    avg(EXTRACT(EPOCH FROM (COALESCE(e.completed_at, e.updated_at) - e.created_at)))
  FROM public.wa_flow_executions e
  LEFT JOIN public.chatweb_sessions s ON s.id = e.chatweb_session_id
  WHERE public.is_account_member(_owner)
    AND COALESCE(e.owner_user_id, e.user_id) = _owner
    AND e.created_at >= _from AND e.created_at < _to
  GROUP BY 1, 2
$$;
REVOKE ALL ON FUNCTION public.chatweb_flow_stats(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chatweb_flow_stats(uuid, timestamptz, timestamptz) TO authenticated;

CREATE POLICY chatweb_avatars_read ON storage.objects FOR SELECT USING (bucket_id = 'chatweb-avatars');
CREATE POLICY chatweb_avatars_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chatweb-avatars' AND public.is_account_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY chatweb_avatars_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chatweb-avatars' AND public.is_account_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY chatweb_avatars_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chatweb-avatars' AND public.is_account_member(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS chatweb_avatars_read ON storage.objects;
CREATE POLICY chatweb_avatars_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chatweb-avatars' AND public.is_account_member(((storage.foldername(name))[1])::uuid));