-- Create table for caching group member avatars
CREATE TABLE public.group_member_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on user_id + phone
CREATE UNIQUE INDEX idx_group_member_avatars_user_phone ON public.group_member_avatars (user_id, phone);

-- Create index for faster lookups
CREATE INDEX idx_group_member_avatars_phone ON public.group_member_avatars (phone);

-- Enable Row Level Security
ALTER TABLE public.group_member_avatars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own cached avatars"
ON public.group_member_avatars
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cached avatars"
ON public.group_member_avatars
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cached avatars"
ON public.group_member_avatars
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cached avatars"
ON public.group_member_avatars
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_group_member_avatars_updated_at
BEFORE UPDATE ON public.group_member_avatars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();