ALTER TABLE public.wa_flow_executions
ADD COLUMN IF NOT EXISTS last_error text;