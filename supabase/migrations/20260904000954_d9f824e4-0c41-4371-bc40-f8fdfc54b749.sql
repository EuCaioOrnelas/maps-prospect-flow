ALTER TABLE public.wiize_api_profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;

CREATE TABLE IF NOT EXISTS public.wiize_api_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  dedupe_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wiize_api_notification_log_dedupe_idx
  ON public.wiize_api_notification_log (user_id, kind, dedupe_key);

GRANT SELECT ON public.wiize_api_notification_log TO authenticated;
GRANT ALL ON public.wiize_api_notification_log TO service_role;

ALTER TABLE public.wiize_api_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own notification log" ON public.wiize_api_notification_log;
CREATE POLICY "own notification log"
  ON public.wiize_api_notification_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.wiize_api_expire_topups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.wiize_api_topups
     SET status = 'canceled'
   WHERE status = 'pending'
     AND created_at < now() - interval '2 hours';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.wiize_api_expire_topups() FROM public;
GRANT EXECUTE ON FUNCTION public.wiize_api_expire_topups() TO service_role;