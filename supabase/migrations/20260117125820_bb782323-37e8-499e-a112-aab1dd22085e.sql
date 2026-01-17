-- Fix overly permissive RLS policies on announcements table
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON public.announcements;

-- Create proper policies for announcements
CREATE POLICY "Authenticated users can view announcements" 
ON public.announcements 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert announcements" 
ON public.announcements 
FOR INSERT 
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Only admins can update announcements" 
ON public.announcements 
FOR UPDATE 
USING (public.is_current_user_admin());

CREATE POLICY "Only admins can delete announcements" 
ON public.announcements 
FOR DELETE 
USING (public.is_current_user_admin());

-- Fix shared_reports policies
DROP POLICY IF EXISTS "Users can create their own shared reports" ON public.shared_reports;
DROP POLICY IF EXISTS "Users can delete their own shared reports" ON public.shared_reports;
DROP POLICY IF EXISTS "Users can view their own shared reports" ON public.shared_reports;
DROP POLICY IF EXISTS "Anyone can view shared reports" ON public.shared_reports;

CREATE POLICY "Users can view their own shared reports" 
ON public.shared_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shared reports" 
ON public.shared_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared reports" 
ON public.shared_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix campaign_processor_heartbeats policies
DROP POLICY IF EXISTS "Allow insert for service role" ON public.campaign_processor_heartbeats;
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.campaign_processor_heartbeats;
DROP POLICY IF EXISTS "Allow update for service role" ON public.campaign_processor_heartbeats;

CREATE POLICY "Only admins can view heartbeats" 
ON public.campaign_processor_heartbeats 
FOR SELECT 
USING (public.is_current_user_admin());

CREATE POLICY "Service role can insert heartbeats" 
ON public.campaign_processor_heartbeats 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update heartbeats" 
ON public.campaign_processor_heartbeats 
FOR UPDATE 
USING (true);