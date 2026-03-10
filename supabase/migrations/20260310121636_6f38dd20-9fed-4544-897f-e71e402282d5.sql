CREATE TABLE public.checkout_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  name text,
  plan_attempted text NOT NULL,
  stripe_session_id text,
  checkout_started_at timestamptz NOT NULL DEFAULT now(),
  checkout_completed boolean NOT NULL DEFAULT false,
  checkout_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage checkout leads" ON public.checkout_leads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage checkout leads" ON public.checkout_leads
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own checkout leads" ON public.checkout_leads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_checkout_leads_completed ON public.checkout_leads(checkout_completed);
CREATE INDEX idx_checkout_leads_started_at ON public.checkout_leads(checkout_started_at);
CREATE INDEX idx_checkout_leads_user_id ON public.checkout_leads(user_id);