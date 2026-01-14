-- Create announcements table for admin notifications
CREATE TABLE public.announcements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user read announcements table
CREATE TABLE public.user_announcement_reads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_announcement_reads ENABLE ROW LEVEL SECURITY;

-- Announcements policies - everyone can view, only admins can manage
CREATE POLICY "Anyone can view active announcements" 
ON public.announcements 
FOR SELECT 
USING (expires_at > now());

CREATE POLICY "Admins can insert announcements" 
ON public.announcements 
FOR INSERT 
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update announcements" 
ON public.announcements 
FOR UPDATE 
USING (public.is_current_user_admin());

CREATE POLICY "Admins can delete announcements" 
ON public.announcements 
FOR DELETE 
USING (public.is_current_user_admin());

-- User announcement reads policies
CREATE POLICY "Users can view their own reads" 
ON public.user_announcement_reads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark as read" 
ON public.user_announcement_reads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();