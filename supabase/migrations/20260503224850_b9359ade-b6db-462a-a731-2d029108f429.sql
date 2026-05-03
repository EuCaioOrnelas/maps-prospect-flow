ALTER TABLE public.whatsapp_numbers
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz;