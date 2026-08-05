ALTER TABLE public.sdr_sessions
  ADD COLUMN IF NOT EXISTS next_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_reason text,
  ADD COLUMN IF NOT EXISTS closed_reason text,
  ADD COLUMN IF NOT EXISTS last_processed_at timestamptz;

CREATE INDEX IF NOT EXISTS sdr_sessions_due_followup_idx
  ON public.sdr_sessions (next_followup_at)
  WHERE status = 'active' AND next_followup_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS sdr_sessions_agent_phone_active_idx
  ON public.sdr_sessions (agent_id, phone)
  WHERE status = 'active';