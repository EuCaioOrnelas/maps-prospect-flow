CREATE TABLE IF NOT EXISTS public.calendar_google_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  owner_user_id uuid,
  google_token_id uuid,
  google_email text,
  calendar_id text NOT NULL DEFAULT 'primary',
  calendar_name text,
  sync_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  pull_enabled boolean NOT NULL DEFAULT true,
  sync_window_days integer NOT NULL DEFAULT 60,
  default_event_type text NOT NULL DEFAULT 'meeting',
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_google_sync TO authenticated;
GRANT ALL ON public.calendar_google_sync TO service_role;

ALTER TABLE public.calendar_google_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own google calendar sync" ON public.calendar_google_sync;
CREATE POLICY "own google calendar sync" ON public.calendar_google_sync
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_calendar_events_external
  ON public.calendar_events (assigned_user_id, external_event_id)
  WHERE external_event_id IS NOT NULL;