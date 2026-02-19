-- Temporarily disable the protection trigger to update admin user
ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_fields;

UPDATE public.profiles 
SET plan = 'scale', 
    searches_limit = 1200, 
    searches_used = 0, 
    admin_assigned_plan = true
WHERE email = 'caiowiize@gmail.com';

ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_fields;