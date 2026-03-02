-- Add phone_key column to warming_sessions for phone-based matching
-- phone_key stores last 8 digits of the phone number to match across different formats
ALTER TABLE public.warming_sessions ADD COLUMN IF NOT EXISTS phone_key TEXT;

-- Add last_active_date to track the last date warming actually ran (for activity-based day counting)
ALTER TABLE public.warming_sessions ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Add phone_key to warming_search_assignments so assignments follow the phone too
ALTER TABLE public.warming_search_assignments ADD COLUMN IF NOT EXISTS phone_key TEXT;

-- Create index for fast phone_key lookups
CREATE INDEX IF NOT EXISTS idx_warming_sessions_phone_key ON public.warming_sessions(phone_key) WHERE phone_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warming_search_assignments_phone_key ON public.warming_search_assignments(phone_key) WHERE phone_key IS NOT NULL;