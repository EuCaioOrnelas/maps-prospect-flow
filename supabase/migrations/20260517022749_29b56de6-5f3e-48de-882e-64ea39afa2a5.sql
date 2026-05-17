ALTER TABLE public.user_waba_connections
  ADD COLUMN IF NOT EXISTS webhook_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_waba_webhook_pending
  ON public.user_waba_connections (user_id)
  WHERE webhook_verified_at IS NULL;