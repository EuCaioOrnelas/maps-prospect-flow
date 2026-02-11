
-- Allow admins to view all campaigns (for debug panel)
CREATE POLICY "Admins can view all campaigns"
ON public.whatsapp_campaigns
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all whatsapp numbers (for debug panel)
CREATE POLICY "Admins can view all numbers"
ON public.whatsapp_numbers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all profiles (already exists, skipping)
