CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  CREATE TYPE public.calendar_event_type AS ENUM ('meeting','demo','call','followup','visit','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.calendar_event_status AS ENUM ('scheduled','confirmed','completed','cancelled','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.calendar_event_source AS ENUM ('manual','sdr','flow','import');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  assigned_user_id uuid NOT NULL,
  created_by uuid,
  title text NOT NULL,
  description text,
  event_type public.calendar_event_type NOT NULL DEFAULT 'meeting',
  status public.calendar_event_status NOT NULL DEFAULT 'scheduled',
  source public.calendar_event_source NOT NULL DEFAULT 'manual',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  conversation_id uuid,
  sdr_agent_id uuid,
  contact_name text,
  company_name text,
  contact_phone text,
  contact_email text,
  location text,
  notes text,
  lead_origin text,
  reminders jsonb NOT NULL DEFAULT '[]'::jsonb,
  conference_provider text,
  conference_url text,
  external_calendar_provider text,
  external_event_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_time_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_owner_start ON public.calendar_events (owner_user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_start ON public.calendar_events (assigned_user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead ON public.calendar_events (lead_id);

ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_no_overlap;
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_no_overlap
  EXCLUDE USING gist (
    assigned_user_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status <> 'cancelled');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_calendar_event(_owner uuid, _assigned uuid, _created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _owner = public.get_account_owner(auth.uid())
    AND (
      public.get_account_role(auth.uid()) IN ('owner','admin')
      OR _assigned = auth.uid()
      OR _created_by = auth.uid()
    );
$$;

DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select ON public.calendar_events
FOR SELECT TO authenticated
USING (public.can_manage_calendar_event(owner_user_id, assigned_user_id, created_by));

DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
CREATE POLICY calendar_events_insert ON public.calendar_events
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_calendar_event(owner_user_id, assigned_user_id, created_by));

DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
CREATE POLICY calendar_events_update ON public.calendar_events
FOR UPDATE TO authenticated
USING (public.can_manage_calendar_event(owner_user_id, assigned_user_id, created_by))
WITH CHECK (public.can_manage_calendar_event(owner_user_id, assigned_user_id, created_by));

DROP POLICY IF EXISTS calendar_events_delete ON public.calendar_events;
CREATE POLICY calendar_events_delete ON public.calendar_events
FOR DELETE TO authenticated
USING (public.can_manage_calendar_event(owner_user_id, assigned_user_id, created_by));

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();