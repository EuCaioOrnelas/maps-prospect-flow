CREATE TABLE IF NOT EXISTS public.wiize_pay_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  nonce text NOT NULL UNIQUE,
  event_type text NOT NULL,
  owner_user_id uuid,
  charge_request_id uuid,
  status text NOT NULL DEFAULT 'processed',
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.wiize_pay_webhook_events TO service_role;
ALTER TABLE public.wiize_pay_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wpwe_received ON public.wiize_pay_webhook_events(received_at);
ALTER TABLE public.wiize_pay_charge_requests ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.wiize_pay_charge_requests ADD COLUMN IF NOT EXISTS last_event_at timestamptz;