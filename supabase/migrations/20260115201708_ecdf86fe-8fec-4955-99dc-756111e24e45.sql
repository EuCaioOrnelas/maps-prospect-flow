-- Add column to store subscription renewal date
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamp with time zone;