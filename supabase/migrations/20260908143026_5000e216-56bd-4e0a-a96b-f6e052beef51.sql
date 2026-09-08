ALTER TABLE public.user_waba_connections
  ADD COLUMN IF NOT EXISTS evolution_disconnected_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evolution_qr_alert_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_waba_conn_evo_disconnected
  ON public.user_waba_connections (provider, evolution_disconnected_since);