DROP POLICY IF EXISTS "Service role can insert api key status" ON public.api_key_status;
DROP POLICY IF EXISTS "Service role can update api key status" ON public.api_key_status;
DROP POLICY IF EXISTS "Admins can view api key status" ON public.api_key_status;

CREATE POLICY "Service role manages api key status"
ON public.api_key_status
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.api_key_status FROM anon, authenticated;
GRANT SELECT ON public.api_key_status TO authenticated;
GRANT ALL ON public.api_key_status TO service_role;