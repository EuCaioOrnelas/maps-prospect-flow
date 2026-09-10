CREATE OR REPLACE FUNCTION public.accessible_owner_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(array_agg(DISTINCT oid), ARRAY[]::uuid[])
  FROM (
    SELECT auth.uid() AS oid WHERE auth.uid() IS NOT NULL
    UNION
    SELECT p.parent_owner_id FROM public.profiles p
     WHERE p.id = auth.uid() AND p.parent_owner_id IS NOT NULL
    UNION
    SELECT am.owner_user_id FROM public.account_members am
     WHERE am.user_id = auth.uid() AND am.status = 'active'
  ) s
  WHERE oid IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.accessible_owner_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accessible_owner_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accessible_owner_ids() TO service_role;