REVOKE ALL ON FUNCTION public.enforce_instagram_connection_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_instagram_connection_limit() TO service_role;