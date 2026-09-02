DO $mig$
DECLARE src text; newsrc text;
BEGIN
  SELECT prosrc INTO src FROM pg_proc
   WHERE proname='attribute_partner_lead' AND pronamespace='public'::regnamespace;

  IF position('not_allowed_partner_attribution_source' in src) > 0 THEN
    RETURN;
  END IF;

  newsrc := replace(src,
    'IF p_source IS DISTINCT FROM ''auth_trigger'' THEN',
    'IF p_source = ''auth_trigger'' AND coalesce(auth.role(), ''anon'') IN (''anon'', ''authenticated'') THEN
    RAISE EXCEPTION ''not_allowed_partner_attribution_source'' USING ERRCODE = ''42501'';
  END IF;

  IF p_source IS DISTINCT FROM ''auth_trigger'' THEN');

  IF newsrc = src THEN
    RAISE EXCEPTION 'guard anchor not found';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.attribute_partner_lead(p_user_id uuid, p_email text, p_name text DEFAULT NULL::text, p_referral_code text DEFAULT NULL::text, p_click_id uuid DEFAULT NULL::uuid, p_partner_id uuid DEFAULT NULL::uuid, p_referral_link_id uuid DEFAULT NULL::uuid, p_source text DEFAULT ''client''::text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS %L', newsrc);
END
$mig$;

REVOKE EXECUTE ON FUNCTION public.attribute_partner_lead(uuid, text, text, text, uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attribute_partner_lead(uuid, text, text, text, uuid, uuid, uuid, text) TO authenticated, service_role;