REVOKE ALL ON FUNCTION public.acquire_job_lease(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_job_lease(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_job_lease(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_job_lease(text) TO service_role;
REVOKE ALL ON FUNCTION public.is_email_suppressed(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_email_suppressed(text) TO authenticated, service_role;