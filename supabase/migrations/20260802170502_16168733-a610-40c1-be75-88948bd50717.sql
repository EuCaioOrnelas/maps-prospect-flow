
CREATE TABLE IF NOT EXISTS public.sdr_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  created_by uuid,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  objective text NOT NULL DEFAULT 'reuniao',
  objective_custom text,
  whatsapp_number_ids uuid[] NOT NULL DEFAULT '{}',
  schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggers jsonb NOT NULL DEFAULT '{}'::jsonb,
  personality jsonb NOT NULL DEFAULT '{}'::jsonb,
  strategy jsonb NOT NULL DEFAULT '{}'::jsonb,
  knowledge jsonb NOT NULL DEFAULT '{}'::jsonb,
  closing jsonb NOT NULL DEFAULT '{}'::jsonb,
  situations jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sdr_agents TO authenticated;
GRANT ALL ON public.sdr_agents TO service_role;
ALTER TABLE public.sdr_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sdr_agents_account_all" ON public.sdr_agents;
CREATE POLICY "sdr_agents_account_all" ON public.sdr_agents
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = public.get_account_owner(auth.uid()))
  WITH CHECK (owner_user_id = auth.uid() OR owner_user_id = public.get_account_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS sdr_agents_owner_idx ON public.sdr_agents(owner_user_id);

CREATE TABLE IF NOT EXISTS public.sdr_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.sdr_agents(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  lead_id uuid,
  phone text,
  contact_name text,
  stage text NOT NULL DEFAULT 'nao_conhece',
  status text NOT NULL DEFAULT 'active',
  current_goal text,
  memory jsonb NOT NULL DEFAULT '{}'::jsonb,
  messages_sent integer NOT NULL DEFAULT 0,
  replies_received integer NOT NULL DEFAULT 0,
  followups_sent integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  last_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sdr_sessions TO authenticated;
GRANT ALL ON public.sdr_sessions TO service_role;
ALTER TABLE public.sdr_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sdr_sessions_account_all" ON public.sdr_sessions;
CREATE POLICY "sdr_sessions_account_all" ON public.sdr_sessions
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = public.get_account_owner(auth.uid()))
  WITH CHECK (owner_user_id = auth.uid() OR owner_user_id = public.get_account_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS sdr_sessions_agent_idx ON public.sdr_sessions(agent_id);
CREATE INDEX IF NOT EXISTS sdr_sessions_owner_idx ON public.sdr_sessions(owner_user_id);

CREATE TABLE IF NOT EXISTS public.sdr_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.sdr_agents(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sdr_sessions(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  trigger_type text NOT NULL DEFAULT 'inbound',
  inbound_message text,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  strategy jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sdr_runs TO authenticated;
GRANT ALL ON public.sdr_runs TO service_role;
ALTER TABLE public.sdr_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sdr_runs_account_all" ON public.sdr_runs;
CREATE POLICY "sdr_runs_account_all" ON public.sdr_runs
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = public.get_account_owner(auth.uid()))
  WITH CHECK (owner_user_id = auth.uid() OR owner_user_id = public.get_account_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS sdr_runs_agent_idx ON public.sdr_runs(agent_id);

DROP TRIGGER IF EXISTS sdr_agents_set_updated_at ON public.sdr_agents;
CREATE TRIGGER sdr_agents_set_updated_at BEFORE UPDATE ON public.sdr_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS sdr_sessions_set_updated_at ON public.sdr_sessions;
CREATE TRIGGER sdr_sessions_set_updated_at BEFORE UPDATE ON public.sdr_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
