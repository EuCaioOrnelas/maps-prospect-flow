ALTER TABLE public.sdr_sessions
  ADD COLUMN IF NOT EXISTS conversation_id uuid,
  ADD COLUMN IF NOT EXISTS waba_connection_id uuid,
  ADD COLUMN IF NOT EXISTS phone_number_id text,
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS sdr_sessions_conversation_idx
  ON public.sdr_sessions (conversation_id)
  WHERE conversation_id IS NOT NULL;