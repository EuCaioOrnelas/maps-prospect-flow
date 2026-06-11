-- Force all new flows to be Meta-only by default. Existing rows are untouched.
ALTER TABLE public.wa_automation_flows
  ALTER COLUMN api_type SET DEFAULT 'meta';

-- Optional column to carry a default out-of-window template at the flow level,
-- used by the runner when a specific node has no template configured.
ALTER TABLE public.wa_automation_flows
  ADD COLUMN IF NOT EXISTS default_out_of_window_template jsonb;