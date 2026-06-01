
-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.account_role AS ENUM ('owner','admin','operational');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.account_member_status AS ENUM ('active','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. profiles columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_owner_id uuid NULL,
  ADD COLUMN IF NOT EXISTS account_role public.account_role NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_parent_owner_id ON public.profiles(parent_owner_id);

-- 3. account_members
CREATE TABLE IF NOT EXISTS public.account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text,
  email text,
  role public.account_role NOT NULL DEFAULT 'operational',
  status public.account_member_status NOT NULL DEFAULT 'active',
  must_change_password boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  last_login_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_account_members_owner ON public.account_members(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_account_members_user ON public.account_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_members TO authenticated;
GRANT ALL ON public.account_members TO service_role;

ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- 4. account_audit_log
CREATE TABLE IF NOT EXISTS public.account_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  actor_user_id uuid NULL,
  action text NOT NULL,
  target_user_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_audit_owner ON public.account_audit_log(owner_user_id);

GRANT SELECT ON public.account_audit_log TO authenticated;
GRANT ALL ON public.account_audit_log TO service_role;

ALTER TABLE public.account_audit_log ENABLE ROW LEVEL SECURITY;

-- 5. Security definer helpers
CREATE OR REPLACE FUNCTION public.get_account_owner(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p.parent_owner_id, p.id)
  FROM public.profiles p
  WHERE p.id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_account_role(_user_id uuid)
RETURNS public.account_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p.account_role, 'owner'::public.account_role)
  FROM public.profiles p
  WHERE p.id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.count_account_members(_owner uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Inclui o próprio owner + membros ativos/inativos cadastrados
  SELECT 1 + COALESCE((
    SELECT COUNT(*)::int FROM public.account_members
    WHERE owner_user_id = _owner
  ), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_account_seat_limit(_owner uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE lower(COALESCE(plan,'free'))
    WHEN 'start'  THEN 3
    WHEN 'growth' THEN 6
    ELSE 2147483647
  END
  FROM public.profiles
  WHERE id = _owner
  LIMIT 1;
$$;

-- 6. Backfill: todos os profiles existentes são owners da própria conta
UPDATE public.profiles
SET account_role = 'owner', parent_owner_id = NULL
WHERE account_role IS NULL;

-- 7. RLS policies
DROP POLICY IF EXISTS "account_members_select_same_account" ON public.account_members;
CREATE POLICY "account_members_select_same_account"
ON public.account_members FOR SELECT TO authenticated
USING (owner_user_id = public.get_account_owner(auth.uid()));

-- Front não insere/edita diretamente — só via edge function (service_role).
-- Mantemos uma policy minimal de UPDATE só para o próprio user atualizar last_login_at.
DROP POLICY IF EXISTS "account_members_self_update_lastlogin" ON public.account_members;
CREATE POLICY "account_members_self_update_lastlogin"
ON public.account_members FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "audit_select_account_admins" ON public.account_audit_log;
CREATE POLICY "audit_select_account_admins"
ON public.account_audit_log FOR SELECT TO authenticated
USING (
  owner_user_id = public.get_account_owner(auth.uid())
  AND public.get_account_role(auth.uid()) IN ('owner','admin')
);

-- 8. Trigger: mantém profiles.account_role em sincronia com account_members
CREATE OR REPLACE FUNCTION public.sync_profile_account_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role) THEN
    UPDATE public.profiles
      SET account_role = NEW.role,
          parent_owner_id = NEW.owner_user_id,
          must_change_password = NEW.must_change_password
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_account_role ON public.account_members;
CREATE TRIGGER trg_sync_profile_account_role
AFTER INSERT OR UPDATE ON public.account_members
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_account_role();

-- 9. updated_at trigger
DROP TRIGGER IF EXISTS trg_account_members_updated_at ON public.account_members;
CREATE TRIGGER trg_account_members_updated_at
BEFORE UPDATE ON public.account_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
