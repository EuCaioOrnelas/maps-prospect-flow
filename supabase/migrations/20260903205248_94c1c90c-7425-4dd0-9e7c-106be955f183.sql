CREATE TABLE IF NOT EXISTS public.wiize_api_topups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_brl NUMERIC(12,2) NOT NULL,
  tokens INTEGER NOT NULL,
  provider TEXT NOT NULL DEFAULT 'asaas',
  method TEXT NOT NULL DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'pending',
  asaas_customer_id TEXT,
  asaas_payment_id TEXT,
  pix_payload TEXT,
  pix_qr_image TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  paid_at TIMESTAMPTZ,
  credited_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wiize_api_topups_payment_uidx ON public.wiize_api_topups (asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wiize_api_topups_user_idx ON public.wiize_api_topups (user_id, created_at DESC);

GRANT SELECT ON public.wiize_api_topups TO authenticated;
GRANT ALL ON public.wiize_api_topups TO service_role;

ALTER TABLE public.wiize_api_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can view own topups" ON public.wiize_api_topups;
CREATE POLICY "Owner can view own topups"
ON public.wiize_api_topups FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_wiize_api_topups_updated_at ON public.wiize_api_topups;
CREATE TRIGGER trg_wiize_api_topups_updated_at
BEFORE UPDATE ON public.wiize_api_topups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();