-- Create user_onboarding table for first-time onboarding responses
CREATE TABLE public.user_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  user_profile TEXT NOT NULL,
  service_types TEXT[] NOT NULL,
  main_objective TEXT NOT NULL,
  team_size TEXT NOT NULL,
  previous_experience TEXT,
  previous_tool TEXT,
  skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trial_feedback table for end-of-trial feedback
CREATE TABLE public.trial_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  experience_status TEXT NOT NULL,
  not_continue_reason TEXT,
  missing_features TEXT,
  nps_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_events table for tracking events
CREATE TABLE public.user_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_onboarding
CREATE POLICY "Users can view their own onboarding" 
ON public.user_onboarding 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding" 
ON public.user_onboarding 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding" 
ON public.user_onboarding 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for trial_feedback
CREATE POLICY "Users can view their own feedback" 
ON public.trial_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" 
ON public.trial_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback" 
ON public.trial_feedback 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for user_events
CREATE POLICY "Users can insert their own events" 
ON public.user_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all events" 
ON public.user_events 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trial_start_at column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster queries
CREATE INDEX idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX idx_user_events_event_name ON public.user_events(event_name);
CREATE INDEX idx_user_events_created_at ON public.user_events(created_at);