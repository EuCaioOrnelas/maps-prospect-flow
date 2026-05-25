
-- 1) partner_settings: hide admin_notification_emails column from anon/authenticated
REVOKE SELECT (admin_notification_emails) ON public.partner_settings FROM anon, authenticated;

-- 2) system_settings: restrict reads to whitelisted public keys
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.system_settings;
CREATE POLICY "Public settings readable by authenticated"
ON public.system_settings
FOR SELECT
TO authenticated
USING (key IN ('cpl_benchmark'));

-- 3) security_audit_log: remove authenticated insert (writes go through service role)
DROP POLICY IF EXISTS "Service can insert security logs" ON public.security_audit_log;

-- 4) partner_applications: hide password_hash from clients (service role bypasses)
REVOKE SELECT (password_hash) ON public.partner_applications FROM anon, authenticated;

-- 5) realtime: scope subscriptions to user's own topics only
DROP POLICY IF EXISTS "Users can subscribe to own channels" ON realtime.messages;
CREATE POLICY "Users can subscribe to own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (realtime.topic() LIKE ('%' || (auth.uid())::text || '%'));
