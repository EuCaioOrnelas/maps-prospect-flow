
-- 1. Expand partner_applications with all new fields
ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS phone_secondary text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS access_email text,
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS years_in_market text,
  ADD COLUMN IF NOT EXISTS has_team boolean,
  ADD COLUMN IF NOT EXISTS current_clients_count integer,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS community_url text,
  ADD COLUMN IF NOT EXISTS monthly_leads_estimate text,
  ADD COLUMN IF NOT EXISTS promotion_channels text[],
  ADD COLUMN IF NOT EXISTS expected_monthly_referrals integer,
  ADD COLUMN IF NOT EXISTS promoted_other_softwares boolean,
  ADD COLUMN IF NOT EXISTS other_softwares_details text,
  ADD COLUMN IF NOT EXISTS reason_to_be_partner text,
  ADD COLUMN IF NOT EXISTS reason_to_be_approved text,
  ADD COLUMN IF NOT EXISTS how_would_sell text,
  ADD COLUMN IF NOT EXISTS differential text,
  ADD COLUMN IF NOT EXISTS results_90_days text,
  ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS internal_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS info_accuracy_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_authorized boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- Index for cpf dedup
CREATE INDEX IF NOT EXISTS idx_partner_applications_cpf ON public.partner_applications(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_applications_status_score ON public.partner_applications(status, internal_score DESC);

-- Update status check to allow new statuses
DO $$ BEGIN
  ALTER TABLE public.partner_applications DROP CONSTRAINT IF EXISTS partner_applications_status_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.partner_applications
  ADD CONSTRAINT partner_applications_status_check
  CHECK (status IN ('pending', 'in_review', 'needs_info', 'approved', 'rejected'));

-- 2. Storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-applications', 'partner-applications', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Anyone can upload partner application docs" ON storage.objects;
CREATE POLICY "Anyone can upload partner application docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'partner-applications');

DROP POLICY IF EXISTS "Admins can read partner application docs" ON storage.objects;
CREATE POLICY "Admins can read partner application docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'partner-applications' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete partner application docs" ON storage.objects;
CREATE POLICY "Admins can delete partner application docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'partner-applications' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Pre-check function (used by edge function for fast dedup)
CREATE OR REPLACE FUNCTION public.partner_application_pre_check(p_email text, p_cpf text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email_norm text := lower(trim(p_email));
  v_cpf_clean text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
BEGIN
  -- email already a partner
  IF EXISTS (SELECT 1 FROM partners WHERE lower(email) = v_email_norm) THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'email_is_partner',
      'message', 'Este email já está cadastrado como parceiro.');
  END IF;

  -- email already has pending/approved application
  IF EXISTS (
    SELECT 1 FROM partner_applications
    WHERE lower(email) = v_email_norm AND status IN ('pending','in_review','approved')
  ) THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'email_already_applied',
      'message', 'Já existe uma candidatura em análise para este email.');
  END IF;

  -- cpf duplicate (only if provided)
  IF length(v_cpf_clean) >= 11 THEN
    IF EXISTS (
      SELECT 1 FROM partner_applications
      WHERE regexp_replace(coalesce(cpf,''), '[^0-9]', '', 'g') = v_cpf_clean
        AND status IN ('pending','in_review','approved')
    ) THEN
      RETURN jsonb_build_object('blocked', true, 'reason', 'cpf_already_applied',
        'message', 'Já existe uma candidatura em análise para este CPF.');
    END IF;
    IF EXISTS (
      SELECT 1 FROM partners WHERE regexp_replace(coalesce(tax_id,''), '[^0-9]', '', 'g') = v_cpf_clean
    ) THEN
      RETURN jsonb_build_object('blocked', true, 'reason', 'cpf_is_partner',
        'message', 'Este CPF já está vinculado a um parceiro.');
    END IF;
  END IF;

  RETURN jsonb_build_object('blocked', false);
END;
$$;
