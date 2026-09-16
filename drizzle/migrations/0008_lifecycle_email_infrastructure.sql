-- ============================================================
-- Lifecycle Email Infrastructure (Campaign > Steps > Enrollment
-- > Delivery > Events > Conversion)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lifecycle_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'draft',
  from_name TEXT NOT NULL DEFAULT 'Wiize',
  from_email TEXT NOT NULL DEFAULT 'no-reply@wiize.com.br',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_campaigns TO authenticated;
GRANT ALL ON public.lifecycle_campaigns TO service_role;
ALTER TABLE public.lifecycle_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lifecycle campaigns" ON public.lifecycle_campaigns
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.lifecycle_campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.lifecycle_campaigns(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  day_offset INTEGER NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  preheader TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT 'trial_active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_steps_campaign_day_uniq
  ON public.lifecycle_campaign_steps (campaign_id, day_offset);
CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_steps_campaign_key_uniq
  ON public.lifecycle_campaign_steps (campaign_id, key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_campaign_steps TO authenticated;
GRANT ALL ON public.lifecycle_campaign_steps TO service_role;
ALTER TABLE public.lifecycle_campaign_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lifecycle steps" ON public.lifecycle_campaign_steps
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.lifecycle_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.lifecycle_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  recipient_email TEXT,
  anchor_at TIMESTAMPTZ NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  exited_at TIMESTAMPTZ,
  exit_reason TEXT,
  converted_at TIMESTAMPTZ,
  converted_step_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_enrollments_campaign_user_uniq
  ON public.lifecycle_enrollments (campaign_id, user_id);
CREATE INDEX IF NOT EXISTS lifecycle_enrollments_status_idx
  ON public.lifecycle_enrollments (status, campaign_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_enrollments TO authenticated;
GRANT ALL ON public.lifecycle_enrollments TO service_role;
ALTER TABLE public.lifecycle_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lifecycle enrollments" ON public.lifecycle_enrollments
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.lifecycle_email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.lifecycle_campaigns(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.lifecycle_campaign_steps(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.lifecycle_enrollments(id) ON DELETE SET NULL,
  user_id UUID,
  recipient_email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  is_test BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotência: um único envio real por (etapa, usuário)
CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_deliveries_step_user_uniq
  ON public.lifecycle_email_deliveries (step_id, user_id)
  WHERE is_test = false AND user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lifecycle_deliveries_provider_msg_idx
  ON public.lifecycle_email_deliveries (provider_message_id);
CREATE INDEX IF NOT EXISTS lifecycle_deliveries_campaign_idx
  ON public.lifecycle_email_deliveries (campaign_id, step_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_email_deliveries TO authenticated;
GRANT ALL ON public.lifecycle_email_deliveries TO service_role;
ALTER TABLE public.lifecycle_email_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lifecycle deliveries" ON public.lifecycle_email_deliveries
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.lifecycle_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.lifecycle_email_deliveries(id) ON DELETE CASCADE,
  campaign_id UUID,
  step_id UUID,
  user_id UUID,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  link_url TEXT,
  link_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_events_provider_event_uniq
  ON public.lifecycle_email_events (provider_event_id)
  WHERE provider_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lifecycle_events_delivery_idx
  ON public.lifecycle_email_events (delivery_id, event_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_email_events TO authenticated;
GRANT ALL ON public.lifecycle_email_events TO service_role;
ALTER TABLE public.lifecycle_email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lifecycle events" ON public.lifecycle_email_events
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.lifecycle_worker_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  users_found INTEGER NOT NULL DEFAULT 0,
  enrolled INTEGER NOT NULL DEFAULT 0,
  eligible INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  exited INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_worker_runs TO authenticated;
GRANT ALL ON public.lifecycle_worker_runs TO service_role;
ALTER TABLE public.lifecycle_worker_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read lifecycle worker runs" ON public.lifecycle_worker_runs
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Trava de execução única (single-flight) para o worker
CREATE TABLE IF NOT EXISTS public.lifecycle_worker_locks (
  lock_key TEXT PRIMARY KEY,
  locked_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lifecycle_worker_locks TO authenticated;
GRANT ALL ON public.lifecycle_worker_locks TO service_role;
ALTER TABLE public.lifecycle_worker_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read lifecycle locks" ON public.lifecycle_worker_locks
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.lifecycle_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lifecycle_campaigns_touch ON public.lifecycle_campaigns;
CREATE TRIGGER lifecycle_campaigns_touch BEFORE UPDATE ON public.lifecycle_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.lifecycle_touch_updated_at();

DROP TRIGGER IF EXISTS lifecycle_steps_touch ON public.lifecycle_campaign_steps;
CREATE TRIGGER lifecycle_steps_touch BEFORE UPDATE ON public.lifecycle_campaign_steps
  FOR EACH ROW EXECUTE FUNCTION public.lifecycle_touch_updated_at();

DROP TRIGGER IF EXISTS lifecycle_enrollments_touch ON public.lifecycle_enrollments;
CREATE TRIGGER lifecycle_enrollments_touch BEFORE UPDATE ON public.lifecycle_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.lifecycle_touch_updated_at();

DROP TRIGGER IF EXISTS lifecycle_deliveries_touch ON public.lifecycle_email_deliveries;
CREATE TRIGGER lifecycle_deliveries_touch BEFORE UPDATE ON public.lifecycle_email_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.lifecycle_touch_updated_at();