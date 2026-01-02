-- Create table to store API key status
CREATE TABLE public.api_key_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name text NOT NULL,
  key_index integer NOT NULL,
  status text NOT NULL DEFAULT 'unknown',
  message text,
  error_details text,
  last_checked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(key_name, key_index)
);

-- Enable RLS
ALTER TABLE public.api_key_status ENABLE ROW LEVEL SECURITY;

-- Only admins can view API key status
CREATE POLICY "Admins can view api key status"
ON public.api_key_status
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage (for edge function)
CREATE POLICY "Service role can manage api key status"
ON public.api_key_status
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_api_key_status_updated_at
BEFORE UPDATE ON public.api_key_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial records for SerpAPI keys
INSERT INTO public.api_key_status (key_name, key_index, status, message) VALUES
  ('SERP_API_KEY', 1, 'unknown', 'Aguardando verificação'),
  ('SERP_API_KEY_2', 2, 'unknown', 'Aguardando verificação'),
  ('SERP_API_KEY_3', 3, 'unknown', 'Aguardando verificação'),
  ('SERP_API_KEY_4', 4, 'unknown', 'Aguardando verificação');