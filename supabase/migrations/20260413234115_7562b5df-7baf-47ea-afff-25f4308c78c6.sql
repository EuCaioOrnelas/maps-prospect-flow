
CREATE TABLE public.subscription_cancellations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'asaas',
  subscription_id TEXT,
  billing_type TEXT,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_charge_date TEXT,
  active_until TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cancellations"
  ON public.subscription_cancellations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cancellations"
  ON public.subscription_cancellations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
