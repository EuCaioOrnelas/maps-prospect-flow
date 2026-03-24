-- Temporarily disable the protection trigger to restore admin account
ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_fields;

UPDATE public.profiles 
SET plan = 'scale', 
    searches_limit = 1200, 
    payment_provider = 'stripe',
    admin_assigned_plan = true,
    updated_at = NOW()
WHERE id = '62ba5c53-a297-49cd-9ca3-b44302fc59f4';

-- Mark all old test checkout_leads as completed
UPDATE public.checkout_leads 
SET checkout_completed = true, 
    checkout_completed_at = NOW()
WHERE email = 'raxav85727@isfew.com' 
  AND checkout_completed = false;

-- Re-enable the protection trigger
ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_fields;