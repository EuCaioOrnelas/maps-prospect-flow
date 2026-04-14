
-- Create company_services table
CREATE TABLE public.company_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  average_ticket NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_services ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own services"
ON public.company_services FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own services"
ON public.company_services FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own services"
ON public.company_services FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own services"
ON public.company_services FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_company_services_updated_at
BEFORE UPDATE ON public.company_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster user lookups
CREATE INDEX idx_company_services_user_id ON public.company_services(user_id);
