DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='security_audit_log'
      AND policyname='Users can view own meta webhook security events'
  ) THEN
    CREATE POLICY "Users can view own meta webhook security events"
    ON public.security_audit_log
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND resource_type = 'meta_webhook');
  END IF;
END $$;