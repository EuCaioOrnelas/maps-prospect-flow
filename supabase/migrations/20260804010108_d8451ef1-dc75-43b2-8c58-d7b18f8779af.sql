-- 1) Fix mutable search_path
ALTER FUNCTION public.touch_chat_auto_replies() SET search_path = public;

-- 2) Helper: is the storage object owned by me or by a member of my account?
CREATE OR REPLACE FUNCTION public.storage_object_account_readable(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
  owner_txt text;
  owner_id uuid;
BEGIN
  IF auth.uid() IS NULL OR _name IS NULL THEN
    RETURN false;
  END IF;
  parts := string_to_array(_name, '/');
  IF array_length(parts, 1) IS NULL THEN
    RETURN false;
  END IF;
  owner_txt := parts[1];
  -- some folders are prefixed (e.g. quick-replies/<user_id>/...)
  IF owner_txt !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    owner_txt := parts[2];
  END IF;
  IF owner_txt IS NULL OR owner_txt !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;
  owner_id := owner_txt::uuid;
  IF owner_id = auth.uid() THEN
    RETURN true;
  END IF;
  RETURN public.current_account_owner() IS NOT NULL
     AND public.get_account_owner(owner_id) = public.current_account_owner();
END;
$$;

REVOKE ALL ON FUNCTION public.storage_object_account_readable(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_object_account_readable(text) TO authenticated, service_role;

-- 3) chat-media: remove blanket read access
DROP POLICY IF EXISTS "Public read access to chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own chat media" ON storage.objects;

CREATE POLICY "Account members read own chat media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media' AND public.storage_object_account_readable(name));

-- 4) deal-attachments: remove blanket read access
DROP POLICY IF EXISTS "Deal attachments are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read deal-attachments" ON storage.objects;

CREATE POLICY "Account members read own deal attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'deal-attachments' AND public.storage_object_account_readable(name));

-- 5) partner_settings: only admins and partners
DROP POLICY IF EXISTS "Authenticated users read settings" ON public.partner_settings;

CREATE POLICY "Admins and partners read settings"
ON public.partner_settings FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.user_id = auth.uid())
);

-- 6) profiles: no sibling-to-sibling PII exposure
DROP POLICY IF EXISTS "Account members can view sibling profiles" ON public.profiles;

CREATE POLICY "Users view own, owner and their members profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR id = public.current_account_owner()
  OR public.get_account_owner(id) = auth.uid()
);
