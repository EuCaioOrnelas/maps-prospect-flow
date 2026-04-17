ALTER TABLE public.user_onboarding 
ADD COLUMN IF NOT EXISTS tour_completed_at timestamp with time zone;