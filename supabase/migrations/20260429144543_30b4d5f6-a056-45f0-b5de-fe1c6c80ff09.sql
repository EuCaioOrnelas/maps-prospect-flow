-- Add custom feature permissions column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_feature_permissions jsonb DEFAULT NULL;

COMMENT ON COLUMN public.profiles.custom_feature_permissions IS
  'Array of allowed feature module keys for custom subscriptions. NULL = full access. Only enforced when is_custom_subscription=true.';

-- Helper: check if user has access to a feature module
CREATE OR REPLACE FUNCTION public.has_feature_access(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Non-custom users get full access (gated by their plan elsewhere)
    WHEN NOT COALESCE((SELECT is_custom_subscription FROM public.profiles WHERE id = _user_id), false)
      THEN true
    -- Custom user with NULL permissions = full access
    WHEN (SELECT custom_feature_permissions FROM public.profiles WHERE id = _user_id) IS NULL
      THEN true
    -- Otherwise check the array
    ELSE EXISTS (
      SELECT 1
      FROM public.profiles p,
           jsonb_array_elements_text(p.custom_feature_permissions) AS perm
      WHERE p.id = _user_id
        AND perm = _feature
    )
  END;
$$;