
-- =========================================
-- MEMBER AVAILABILITY
-- =========================================
CREATE TABLE IF NOT EXISTS public.member_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  account_owner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online','away','offline')),
  work_days int[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  work_start time NOT NULL DEFAULT '08:00',
  work_end time NOT NULL DEFAULT '18:00',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  auto_offline_after_minutes int,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_availability TO authenticated;
GRANT ALL ON public.member_availability TO service_role;

ALTER TABLE public.member_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_availability_self_select" ON public.member_availability;
CREATE POLICY "member_availability_self_select" ON public.member_availability
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR account_owner_id = auth.uid()
         OR account_owner_id = public.get_account_owner(auth.uid()));

DROP POLICY IF EXISTS "member_availability_self_insert" ON public.member_availability;
CREATE POLICY "member_availability_self_insert" ON public.member_availability
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR account_owner_id = auth.uid());

DROP POLICY IF EXISTS "member_availability_self_update" ON public.member_availability;
CREATE POLICY "member_availability_self_update" ON public.member_availability
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR account_owner_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR account_owner_id = auth.uid());

DROP POLICY IF EXISTS "member_availability_owner_delete" ON public.member_availability;
CREATE POLICY "member_availability_owner_delete" ON public.member_availability
  FOR DELETE TO authenticated
  USING (account_owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_member_availability_owner ON public.member_availability(account_owner_id);

CREATE OR REPLACE FUNCTION public.update_member_availability_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_member_availability_updated_at ON public.member_availability;
CREATE TRIGGER trg_member_availability_updated_at
  BEFORE UPDATE ON public.member_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_member_availability_updated_at();

-- Seed default availability for existing account_members and owners
INSERT INTO public.member_availability (user_id, account_owner_id)
SELECT user_id, owner_user_id FROM public.account_members
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- =========================================
-- HANDOFF ASSIGNMENTS
-- =========================================
CREATE TABLE IF NOT EXISTS public.handoff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid,
  flow_id uuid,
  node_id text,
  account_owner_id uuid NOT NULL,
  conversation_id uuid,
  lead_phone text,
  assigned_member_id uuid,
  team_member_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  distribution_type text NOT NULL DEFAULT 'round_robin' CHECK (distribution_type IN ('specific','round_robin')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('assigned','queued','reassigned','closed','failed','expired')),
  pre_message text,
  post_message text,
  no_agents_message text,
  no_agents_actions text[] NOT NULL DEFAULT ARRAY[]::text[],
  redirect_flow_id uuid,
  max_wait_seconds int,
  attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  queued_at timestamptz,
  assigned_at timestamptz,
  first_response_at timestamptz,
  closed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.handoff_assignments TO authenticated;
GRANT ALL ON public.handoff_assignments TO service_role;

ALTER TABLE public.handoff_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "handoff_assignments_account_read" ON public.handoff_assignments;
CREATE POLICY "handoff_assignments_account_read" ON public.handoff_assignments
  FOR SELECT TO authenticated
  USING (account_owner_id = auth.uid()
         OR account_owner_id = public.get_account_owner(auth.uid())
         OR assigned_member_id = auth.uid());

DROP POLICY IF EXISTS "handoff_assignments_owner_write" ON public.handoff_assignments;
CREATE POLICY "handoff_assignments_owner_write" ON public.handoff_assignments
  FOR ALL TO authenticated
  USING (account_owner_id = auth.uid())
  WITH CHECK (account_owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_handoff_assignments_owner_status ON public.handoff_assignments(account_owner_id, status);
CREATE INDEX IF NOT EXISTS idx_handoff_assignments_queued ON public.handoff_assignments(status, expires_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_handoff_assignments_node ON public.handoff_assignments(node_id, assigned_at DESC);

DROP TRIGGER IF EXISTS trg_handoff_assignments_updated_at ON public.handoff_assignments;
CREATE TRIGGER trg_handoff_assignments_updated_at
  BEFORE UPDATE ON public.handoff_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_member_availability_updated_at();

-- =========================================
-- HANDOFF AUDIT LOG
-- =========================================
CREATE TABLE IF NOT EXISTS public.handoff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid,
  account_owner_id uuid NOT NULL,
  event_type text NOT NULL,
  member_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.handoff_audit_log TO authenticated;
GRANT ALL ON public.handoff_audit_log TO service_role;

ALTER TABLE public.handoff_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "handoff_audit_log_account_read" ON public.handoff_audit_log;
CREATE POLICY "handoff_audit_log_account_read" ON public.handoff_audit_log
  FOR SELECT TO authenticated
  USING (account_owner_id = auth.uid()
         OR account_owner_id = public.get_account_owner(auth.uid()));

DROP POLICY IF EXISTS "handoff_audit_log_owner_insert" ON public.handoff_audit_log;
CREATE POLICY "handoff_audit_log_owner_insert" ON public.handoff_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (account_owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_handoff_audit_owner_time ON public.handoff_audit_log(account_owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handoff_audit_assignment ON public.handoff_audit_log(assignment_id);

-- =========================================
-- HELPER FUNCTION: check member availability
-- =========================================
CREATE OR REPLACE FUNCTION public.is_member_available(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  local_time time;
  local_dow int;
BEGIN
  SELECT * INTO rec FROM public.member_availability WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF rec.status <> 'online' THEN RETURN false; END IF;
  local_time := (now() AT TIME ZONE rec.timezone)::time;
  local_dow  := EXTRACT(DOW FROM (now() AT TIME ZONE rec.timezone))::int;
  IF NOT (local_dow = ANY(rec.work_days)) THEN RETURN false; END IF;
  IF local_time < rec.work_start OR local_time > rec.work_end THEN RETURN false; END IF;
  RETURN true;
END $$;
