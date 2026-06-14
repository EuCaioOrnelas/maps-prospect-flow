ALTER TABLE public.wa_automation_flows
  ADD COLUMN IF NOT EXISTS test_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_phone text;

CREATE INDEX IF NOT EXISTS idx_wa_flows_test_mode ON public.wa_automation_flows (test_mode) WHERE test_mode = true;