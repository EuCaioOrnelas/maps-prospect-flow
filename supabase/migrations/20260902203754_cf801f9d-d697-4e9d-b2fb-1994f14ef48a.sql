DO $mig$
DECLARE src text; newsrc text;
BEGIN
  SELECT prosrc INTO src FROM pg_proc
   WHERE proname='attribute_partner_lead' AND pronamespace='public'::regnamespace;

  newsrc := replace(src,
    'coalesce(auth.role(), ''anon'') IN (''anon'', ''authenticated'')',
    'current_user IN (''anon'', ''authenticated'')');

  IF newsrc = src THEN
    RAISE EXCEPTION 'anchor not found';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.attribute_partner_lead(p_user_id uuid, p_email text, p_name text DEFAULT NULL::text, p_referral_code text DEFAULT NULL::text, p_click_id uuid DEFAULT NULL::uuid, p_partner_id uuid DEFAULT NULL::uuid, p_referral_link_id uuid DEFAULT NULL::uuid, p_source text DEFAULT ''client''::text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS %L', newsrc);
END
$mig$;