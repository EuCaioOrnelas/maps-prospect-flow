
-- Add flag to mark admin-assigned plans (should not be auto-downgraded)
ALTER TABLE public.profiles ADD COLUMN admin_assigned_plan boolean NOT NULL DEFAULT false;

-- Add to the protect_sensitive_profile_fields trigger protection
-- (admin_assigned_plan should only be changed by admins/service role)
