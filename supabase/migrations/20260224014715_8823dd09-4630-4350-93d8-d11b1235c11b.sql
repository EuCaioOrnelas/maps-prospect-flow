
-- Create whatsapp_proxies table
CREATE TABLE public.whatsapp_proxies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host TEXT NOT NULL,
  port TEXT NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'http',
  username TEXT,
  password TEXT,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  assigned_numbers_count INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_proxies ENABLE ROW LEVEL SECURITY;

-- Only admins can manage proxies
CREATE POLICY "Admins can manage proxies"
ON public.whatsapp_proxies
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role can read proxies (for edge functions)
CREATE POLICY "Service role can read proxies"
ON public.whatsapp_proxies
FOR SELECT
USING (true);

-- Add proxy_id to whatsapp_numbers
ALTER TABLE public.whatsapp_numbers ADD COLUMN IF NOT EXISTS proxy_id UUID REFERENCES public.whatsapp_proxies(id) ON DELETE SET NULL;

-- Trigger to update updated_at
CREATE TRIGGER update_whatsapp_proxies_updated_at
BEFORE UPDATE ON public.whatsapp_proxies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
