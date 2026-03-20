
-- PIX invoices table for tracking all PIX charges
CREATE TABLE public.pix_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  user_name text,
  company_name text,
  plan text NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  checkout_url text,
  pix_code text,
  abacate_checkout_id text,
  renewal_stage text,
  subscription_period_end timestamptz,
  paid_at timestamptz,
  expires_at timestamptz,
  last_email_sent_at timestamptz,
  last_email_status text,
  automation_paused boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pix_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pix_invoices" ON public.pix_invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own pix_invoices" ON public.pix_invoices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Renewal email templates table
CREATE TABLE public.renewal_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL UNIQUE,
  subject text NOT NULL,
  preview_text text,
  title text NOT NULL,
  content text NOT NULL,
  cta_text text DEFAULT 'Pagar agora',
  cta_url_template text DEFAULT '{{payment_link}}',
  is_published boolean DEFAULT true,
  draft_subject text,
  draft_content text,
  last_edited_by text,
  last_edited_at timestamptz,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.renewal_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage renewal_email_templates" ON public.renewal_email_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- PIX tracking events table
CREATE TABLE public.pix_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.pix_invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  renewal_stage text,
  email_log_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pix_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pix_tracking_events" ON public.pix_tracking_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_pix_invoices_user_id ON public.pix_invoices(user_id);
CREATE INDEX idx_pix_invoices_status ON public.pix_invoices(status);
CREATE INDEX idx_pix_invoices_renewal_stage ON public.pix_invoices(renewal_stage);
CREATE INDEX idx_pix_tracking_events_invoice_id ON public.pix_tracking_events(invoice_id);
CREATE INDEX idx_pix_tracking_events_user_id ON public.pix_tracking_events(user_id);
