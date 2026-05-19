
-- Order Bumps: colunas em profiles + tabela de auditoria
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS extra_numbers integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_contacts_packs integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_opportunities_packs integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.order_bump_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bump_id text NOT NULL CHECK (bump_id IN ('numbers','contacts','opportunities')),
  delta integer NOT NULL,
  new_quantity integer NOT NULL DEFAULT 0,
  source text NOT NULL CHECK (source IN ('checkout','upgrade','webhook_revoke','webhook_grant','admin')),
  stripe_subscription_id text,
  asaas_subscription_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_bump_events_user ON public.order_bump_events(user_id, created_at DESC);

ALTER TABLE public.order_bump_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own bump events" ON public.order_bump_events;
CREATE POLICY "Users see own bump events"
  ON public.order_bump_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins see all bump events" ON public.order_bump_events;
CREATE POLICY "Admins see all bump events"
  ON public.order_bump_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
