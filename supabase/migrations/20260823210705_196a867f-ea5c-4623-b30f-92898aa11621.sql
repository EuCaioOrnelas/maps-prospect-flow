-- =========================================================
-- 1) OPT-OUT CENTRAL
-- =========================================================
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL DEFAULT 'opt_out',
  source text NOT NULL DEFAULT 'influencer_outreach',
  prospect_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_suppressions TO authenticated;
GRANT ALL ON public.email_suppressions TO service_role;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read suppressions" ON public.email_suppressions;
CREATE POLICY "admins read suppressions" ON public.email_suppressions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.email_optout_tokens (
  token text PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  email text NOT NULL UNIQUE,
  prospect_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_optout_tokens TO authenticated;
GRANT ALL ON public.email_optout_tokens TO service_role;
ALTER TABLE public.email_optout_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read optout tokens" ON public.email_optout_tokens;
CREATE POLICY "admins read optout tokens" ON public.email_optout_tokens
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_email_suppressed(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.email_suppressions WHERE email = lower(trim(_email)));
$$;

-- migra descadastros antigos de influenciadores para a lista central
INSERT INTO public.email_suppressions (email, reason, source, prospect_id)
SELECT lower(email), COALESCE(reason, 'opt_out'), 'influencer_outreach', prospect_id
FROM public.influencer_email_suppressions
ON CONFLICT (email) DO NOTHING;

-- =========================================================
-- 2) FOLLOW-UP INTELIGENTE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.followup_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  prospect_id uuid,
  campaign_id uuid,
  recipient_id uuid,
  status text NOT NULL DEFAULT 'active',
  current_step integer NOT NULL DEFAULT 0,
  max_steps integer NOT NULL DEFAULT 6,
  fit_level text NOT NULL DEFAULT 'medio',
  next_run_at timestamptz,
  last_sent_at timestamptz,
  messages_sent integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  end_reason text,
  first_subject text,
  first_body text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  memory jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS followup_enrollments_active_email
  ON public.followup_enrollments (lower(email)) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS followup_enrollments_due
  ON public.followup_enrollments (next_run_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS followup_enrollments_prospect
  ON public.followup_enrollments (prospect_id);

GRANT SELECT ON public.followup_enrollments TO authenticated;
GRANT ALL ON public.followup_enrollments TO service_role;
ALTER TABLE public.followup_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read followups" ON public.followup_enrollments;
CREATE POLICY "admins read followups" ON public.followup_enrollments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.followup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES public.followup_enrollments(id) ON DELETE CASCADE,
  prospect_id uuid,
  step integer,
  action text NOT NULL,
  reason text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS followup_events_enrollment ON public.followup_events (enrollment_id, created_at DESC);
GRANT SELECT ON public.followup_events TO authenticated;
GRANT ALL ON public.followup_events TO service_role;
ALTER TABLE public.followup_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read followup events" ON public.followup_events;
CREATE POLICY "admins read followup events" ON public.followup_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- idempotência forte: um único envio por etapa
CREATE TABLE IF NOT EXISTS public.followup_sends (
  enrollment_id uuid NOT NULL REFERENCES public.followup_enrollments(id) ON DELETE CASCADE,
  step integer NOT NULL,
  provider_message_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (enrollment_id, step)
);
GRANT SELECT ON public.followup_sends TO authenticated;
GRANT ALL ON public.followup_sends TO service_role;
ALTER TABLE public.followup_sends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read followup sends" ON public.followup_sends;
CREATE POLICY "admins read followup sends" ON public.followup_sends
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 3) TRAVA DE EXECUÇÃO (single-flight)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.job_leases (
  name text PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.job_leases TO service_role;
ALTER TABLE public.job_leases ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.acquire_job_lease(_name text, _seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  INSERT INTO public.job_leases (name, locked_until)
  VALUES (_name, now() + make_interval(secs => _seconds))
  ON CONFLICT (name) DO UPDATE
    SET locked_until = EXCLUDED.locked_until, updated_at = now()
    WHERE public.job_leases.locked_until < now();
  GET DIAGNOSTICS ok = ROW_COUNT;
  RETURN ok;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_job_lease(_name text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.job_leases SET locked_until = now() - interval '1 second' WHERE name = _name;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at_generic()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_followup_enrollments_updated ON public.followup_enrollments;
CREATE TRIGGER trg_followup_enrollments_updated BEFORE UPDATE ON public.followup_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();