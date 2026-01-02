-- Add column to track free trial messages sent
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_messages_sent INTEGER DEFAULT 0;