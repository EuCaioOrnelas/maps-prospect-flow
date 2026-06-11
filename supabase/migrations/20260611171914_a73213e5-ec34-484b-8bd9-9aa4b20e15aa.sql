
-- Deduplicate existing user_waba_connections rows by phone_number_id (keep most recent)
DELETE FROM public.user_waba_connections a
USING public.user_waba_connections b
WHERE a.phone_number_id IS NOT NULL
  AND a.phone_number_id = b.phone_number_id
  AND a.created_at < b.created_at;

-- Add unique partial index so the same phone_number_id can't be cadastrado twice
CREATE UNIQUE INDEX IF NOT EXISTS user_waba_connections_phone_number_id_uniq
  ON public.user_waba_connections (phone_number_id)
  WHERE phone_number_id IS NOT NULL;
