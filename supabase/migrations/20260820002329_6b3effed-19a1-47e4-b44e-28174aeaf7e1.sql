ALTER TYPE public.calendar_event_type ADD VALUE IF NOT EXISTS 'google';
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_no_overlap;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_no_overlap
  EXCLUDE USING gist (assigned_user_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (status <> 'cancelled'::calendar_event_status AND external_event_id IS NULL);