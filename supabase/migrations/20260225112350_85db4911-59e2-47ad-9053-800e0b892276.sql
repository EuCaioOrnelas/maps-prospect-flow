
-- Table to track which WhatsApp numbers are enabled for Revenue analysis
CREATE TABLE public.revenue_number_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, whatsapp_number_id)
);

-- Enable RLS
ALTER TABLE public.revenue_number_config ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage revenue number config"
  ON public.revenue_number_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can manage their own configs
CREATE POLICY "Users can view own revenue number config"
  ON public.revenue_number_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own revenue number config"
  ON public.revenue_number_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own revenue number config"
  ON public.revenue_number_config FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_revenue_number_config_updated_at
  BEFORE UPDATE ON public.revenue_number_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
