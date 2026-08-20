ALTER TABLE public.calendar_google_sync
  ADD COLUMN IF NOT EXISTS pull_all_calendars boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_minutes integer NOT NULL DEFAULT 30;