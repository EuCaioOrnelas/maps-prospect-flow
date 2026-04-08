ALTER TABLE public.wa_automation_flows
ADD COLUMN IF NOT EXISTS api_type text DEFAULT 'evolution',
ADD COLUMN IF NOT EXISTS whatsapp_number_id text,
ADD COLUMN IF NOT EXISTS waba_connection_id text,
ADD COLUMN IF NOT EXISTS phone_number_id text;