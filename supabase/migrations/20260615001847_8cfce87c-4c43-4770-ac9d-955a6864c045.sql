
-- 1) New node type
DO $$ BEGIN
  ALTER TYPE public.wa_flow_node_type ADD VALUE IF NOT EXISTS 'rating';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Ratings table
CREATE TABLE IF NOT EXISTS public.wa_flow_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_user_id uuid,
  flow_id uuid NOT NULL REFERENCES public.wa_automation_flows(id) ON DELETE CASCADE,
  node_id text,
  execution_id uuid,
  contact_phone text NOT NULL,
  contact_name text,
  lead_id uuid,
  rating_name text,
  rating_type text NOT NULL,
  score_numeric numeric,
  score_max numeric,
  score_text text,
  bucket text,
  suggestion_text text,
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_flow_ratings TO authenticated;
GRANT ALL ON public.wa_flow_ratings TO service_role;

ALTER TABLE public.wa_flow_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account members view ratings" ON public.wa_flow_ratings;
CREATE POLICY "Account members view ratings" ON public.wa_flow_ratings FOR SELECT
  USING (is_account_member(COALESCE(owner_user_id, user_id)));
DROP POLICY IF EXISTS "Account members insert ratings" ON public.wa_flow_ratings;
CREATE POLICY "Account members insert ratings" ON public.wa_flow_ratings FOR INSERT
  WITH CHECK (is_account_member(COALESCE(owner_user_id, user_id)));
DROP POLICY IF EXISTS "Account members update ratings" ON public.wa_flow_ratings;
CREATE POLICY "Account members update ratings" ON public.wa_flow_ratings FOR UPDATE
  USING (is_account_member(COALESCE(owner_user_id, user_id)))
  WITH CHECK (is_account_member(COALESCE(owner_user_id, user_id)));
DROP POLICY IF EXISTS "Account members delete ratings" ON public.wa_flow_ratings;
CREATE POLICY "Account members delete ratings" ON public.wa_flow_ratings FOR DELETE
  USING (is_account_member(COALESCE(owner_user_id, user_id)));

CREATE INDEX IF NOT EXISTS idx_wa_flow_ratings_user_created ON public.wa_flow_ratings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_flow_ratings_flow ON public.wa_flow_ratings(flow_id);
CREATE INDEX IF NOT EXISTS idx_wa_flow_ratings_execution ON public.wa_flow_ratings(execution_id);

DROP TRIGGER IF EXISTS trg_wa_flow_ratings_owner ON public.wa_flow_ratings;
CREATE TRIGGER trg_wa_flow_ratings_owner BEFORE INSERT ON public.wa_flow_ratings
  FOR EACH ROW EXECUTE FUNCTION set_owner_user_id_from_user();

DROP TRIGGER IF EXISTS update_wa_flow_ratings_updated_at ON public.wa_flow_ratings;
CREATE TRIGGER update_wa_flow_ratings_updated_at BEFORE UPDATE ON public.wa_flow_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3) Inactivity reset config on flows
ALTER TABLE public.wa_automation_flows
  ADD COLUMN IF NOT EXISTS inactivity_reset_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inactivity_timeout_seconds integer,
  ADD COLUMN IF NOT EXISTS inactivity_action text,
  ADD COLUMN IF NOT EXISTS inactivity_target_node_id text,
  ADD COLUMN IF NOT EXISTS inactivity_message text;

-- 4) Tracking on executions
ALTER TABLE public.wa_flow_executions
  ADD COLUMN IF NOT EXISTS last_user_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS inactivity_processed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wa_exec_inactivity
  ON public.wa_flow_executions(last_user_message_at)
  WHERE status = 'active' AND inactivity_processed_at IS NULL;
