
-- 1) ai_logs: restrict INSERT to service_role
DROP POLICY IF EXISTS "Anyone can insert ai logs" ON public.ai_logs;
DROP POLICY IF EXISTS "Public can insert ai logs" ON public.ai_logs;
DROP POLICY IF EXISTS "Allow insert ai_logs" ON public.ai_logs;
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='ai_logs' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_logs', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Service role inserts ai_logs"
  ON public.ai_logs FOR INSERT TO service_role WITH CHECK (true);

-- 2) support_ticket_events: restrict INSERT to service_role
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='support_ticket_events' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_ticket_events', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Service role inserts ticket events"
  ON public.support_ticket_events FOR INSERT TO service_role WITH CHECK (true);

-- 3) support_messages: require ownership for INSERT
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='support_messages' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_messages', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Owners can insert their support messages"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_messages.ticket_id
        AND st.user_id = auth.uid()
    )
  );
CREATE POLICY "Service role inserts support messages"
  ON public.support_messages FOR INSERT TO service_role WITH CHECK (true);

-- 4) partner_clicks: restrict UPDATE to service_role
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='partner_clicks' AND cmd='UPDATE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.partner_clicks', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Service role updates partner clicks"
  ON public.partner_clicks FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

-- 5) partner_fraud_attempts: restrict INSERT to service_role
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='partner_fraud_attempts' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.partner_fraud_attempts', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Service role inserts fraud attempts"
  ON public.partner_fraud_attempts FOR INSERT TO service_role WITH CHECK (true);

-- 6) blog-images storage bucket: admin-only writes
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname ILIKE '%blog-images%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public can read blog-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "Admins can upload blog-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can update blog-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'blog-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can delete blog-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 7) Column-level REVOKEs (defense-in-depth)
REVOKE SELECT (password_hash) ON public.partner_applications FROM anon, authenticated;

REVOKE SELECT (access_token, refresh_token) ON public.user_drive_connections FROM anon, authenticated;

REVOKE SELECT (access_token, refresh_token) ON public.user_google_tokens FROM anon, authenticated;

REVOKE SELECT (api_key) ON public.user_ai_credentials FROM anon, authenticated;

REVOKE SELECT (trial_card_token, device_fingerprint, signup_ip, fraud_flags, trial_asaas_customer_id)
  ON public.profiles FROM anon, authenticated;
