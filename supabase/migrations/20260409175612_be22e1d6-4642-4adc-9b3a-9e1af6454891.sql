-- Create deal attachments table
CREATE TABLE public.lead_deal_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.lead_deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_deal_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deal attachments"
  ON public.lead_deal_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deal attachments"
  ON public.lead_deal_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deal attachments"
  ON public.lead_deal_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- Create lead files table (for Google Drive integration)
CREATE TABLE public.lead_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other',
  file_url TEXT,
  file_size INTEGER,
  drive_file_id TEXT,
  drive_folder_id TEXT,
  source TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lead files"
  ON public.lead_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead files"
  ON public.lead_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead files"
  ON public.lead_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead files"
  ON public.lead_files FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_lead_files_updated_at
  BEFORE UPDATE ON public.lead_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create user drive connections table
CREATE TABLE public.user_drive_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  root_folder_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_drive_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own drive connection"
  ON public.user_drive_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drive connection"
  ON public.user_drive_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drive connection"
  ON public.user_drive_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_drive_connections_updated_at
  BEFORE UPDATE ON public.user_drive_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for deal attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-attachments', 'deal-attachments', true);

-- Storage policies for deal attachments
CREATE POLICY "Users can upload deal attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'deal-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Deal attachments are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deal-attachments');

CREATE POLICY "Users can delete their own deal attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'deal-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);