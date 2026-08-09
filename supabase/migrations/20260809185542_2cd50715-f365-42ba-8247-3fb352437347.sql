ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'calendar_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS calendar_events_reminder_idx
  ON public.calendar_events (starts_at)
  WHERE reminder_sent_at IS NULL;