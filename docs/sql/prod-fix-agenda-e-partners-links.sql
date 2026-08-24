-- ============================================================
-- WIIZE — CORREÇÃO COMPLETA PARA PRODUÇÃO (idempotente)
-- Agenda (overlap) + Wiize Partners (links personalizados / totais)
-- Pode ser executado quantas vezes quiser, na ordem em que está.
-- ============================================================

-- ------------------------------------------------------------
-- 0) PRÉ-REQUISITOS DE SCHEMA (é o que causava os erros 42703)
-- ------------------------------------------------------------

-- 0.1) Tabela de links personalizados
CREATE TABLE IF NOT EXISTS public.partner_referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  internal_name text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  is_active boolean NOT NULL DEFAULT true,
  total_clicks integer NOT NULL DEFAULT 0,
  total_leads integer NOT NULL DEFAULT 0,
  total_paid_clients integer NOT NULL DEFAULT 0,
  created_by_admin_id uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 0.2) Colunas que podem faltar na tabela já existente
ALTER TABLE public.partner_referral_links
  ADD COLUMN IF NOT EXISTS description        text,
  ADD COLUMN IF NOT EXISTS internal_name      text,
  ADD COLUMN IF NOT EXISTS utm_source         text,
  ADD COLUMN IF NOT EXISTS utm_medium         text,
  ADD COLUMN IF NOT EXISTS utm_campaign       text,
  ADD COLUMN IF NOT EXISTS is_active          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS total_clicks       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_leads        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid_clients integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS expires_at         timestamptz,
  ADD COLUMN IF NOT EXISTS created_at         timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz NOT NULL DEFAULT now();

-- 0.3) Vínculo dos cliques/leads com o link personalizado
ALTER TABLE public.partner_clicks
  ADD COLUMN IF NOT EXISTS referral_link_id uuid REFERENCES public.partner_referral_links(id) ON DELETE SET NULL;

ALTER TABLE public.partner_leads
  ADD COLUMN IF NOT EXISTS referral_link_id   uuid REFERENCES public.partner_referral_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attribution_source text,
  ADD COLUMN IF NOT EXISTS referral_code      text;

CREATE INDEX IF NOT EXISTS idx_partner_clicks_referral_link ON public.partner_clicks(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_partner_leads_referral_link  ON public.partner_leads(referral_link_id);

-- 0.4) Totais agregados do parceiro
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS total_clicks              integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_leads               integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid_clients        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_revenue_cents    bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_commission_cents bigint  NOT NULL DEFAULT 0;

-- 0.5) Grants + RLS da tabela de links
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_referral_links TO authenticated;
GRANT SELECT ON public.partner_referral_links TO anon;
GRANT ALL ON public.partner_referral_links TO service_role;

ALTER TABLE public.partner_referral_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all referral links" ON public.partner_referral_links;
CREATE POLICY "Admins manage all referral links"
ON public.partner_referral_links FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Partners view own referral links" ON public.partner_referral_links;
CREATE POLICY "Partners view own referral links"
ON public.partner_referral_links FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_referral_links.partner_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can read active links by slug" ON public.partner_referral_links;
CREATE POLICY "Public can read active links by slug"
ON public.partner_referral_links FOR SELECT TO anon, authenticated
USING (is_active = true);


-- ------------------------------------------------------------
-- 1) AGENDA: exclusion constraint -> trigger inteligente
-- ------------------------------------------------------------
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_no_overlap;

CREATE OR REPLACE FUNCTION public.calendar_events_check_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cancelados nunca ocupam agenda
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE, só valida se horário/responsável realmente mudou
  IF TG_OP = 'UPDATE'
     AND NEW.starts_at = OLD.starts_at
     AND NEW.ends_at = OLD.ends_at
     AND NEW.assigned_user_id IS NOT DISTINCT FROM OLD.assigned_user_id THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.assigned_user_id = NEW.assigned_user_id
      AND e.id <> NEW.id
      AND e.status <> 'cancelled'
      AND tstzrange(e.starts_at, e.ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'conflicting key value violates exclusion constraint "calendar_events_no_overlap"'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calendar_events_no_overlap ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_no_overlap
BEFORE INSERT OR UPDATE OF starts_at, ends_at, assigned_user_id, status
ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.calendar_events_check_overlap();


-- ------------------------------------------------------------
-- 2) PARCEIROS: recálculo das métricas por link
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_partner_referral_link_stats(p_referral_link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_referral_link_id IS NULL THEN RETURN; END IF;

  UPDATE public.partner_referral_links prl
  SET
    total_clicks = COALESCE((SELECT count(*)::int FROM public.partner_clicks pc WHERE pc.referral_link_id = p_referral_link_id), 0),
    total_leads  = COALESCE((SELECT count(*)::int FROM public.partner_leads  pl WHERE pl.referral_link_id = p_referral_link_id), 0),
    total_paid_clients = COALESCE((
      SELECT count(*)::int FROM public.partner_leads pl
      WHERE pl.referral_link_id = p_referral_link_id AND pl.is_paid = true
    ), 0),
    updated_at = now()
  WHERE prl.id = p_referral_link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recompute_referral_link_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.referral_link_id IS NOT NULL THEN
    PERFORM public.recompute_partner_referral_link_stats(OLD.referral_link_id);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.referral_link_id IS NOT NULL THEN
    PERFORM public.recompute_partner_referral_link_stats(NEW.referral_link_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_leads_link_stats ON public.partner_leads;
CREATE TRIGGER trg_partner_leads_link_stats
AFTER INSERT OR DELETE OR UPDATE OF is_paid, is_cancelled, referral_link_id
ON public.partner_leads
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_referral_link_stats();

DROP TRIGGER IF EXISTS trg_partner_clicks_link_stats ON public.partner_clicks;
CREATE TRIGGER trg_partner_clicks_link_stats
AFTER INSERT OR DELETE ON public.partner_clicks
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_referral_link_stats();


-- ------------------------------------------------------------
-- 3) PARCEIROS: resolver link público + totais do parceiro
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.resolve_partner_referral_link(text);
CREATE FUNCTION public.resolve_partner_referral_link(_slug text)
RETURNS TABLE(referral_code text, utm_source text, utm_medium text, utm_campaign text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.referral_code, prl.utm_source, prl.utm_medium, prl.utm_campaign
  FROM public.partner_referral_links prl
  JOIN public.partners p ON p.id = prl.partner_id
  WHERE lower(prl.slug) = lower(btrim(coalesce(_slug, '')))
    AND prl.is_active = true
    AND (prl.expires_at IS NULL OR prl.expires_at > now())
    AND p.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.recompute_partner_totals(p_partner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_partner_id IS NULL THEN RETURN; END IF;

  UPDATE public.partners p
  SET
    total_clicks = COALESCE((SELECT count(*)::int FROM public.partner_clicks pc WHERE pc.partner_id = p_partner_id), 0),
    total_leads  = COALESCE((SELECT count(*)::int FROM public.partner_leads  pl WHERE pl.partner_id = p_partner_id), 0),
    total_paid_clients = COALESCE((
      SELECT count(DISTINCT u)::int FROM (
        SELECT pl.user_id AS u FROM public.partner_leads pl
        WHERE pl.partner_id = p_partner_id AND pl.is_paid = true AND pl.is_cancelled = false
        UNION
        SELECT ps.customer_user_id FROM public.partner_sales ps
        WHERE ps.partner_id = p_partner_id
      ) s
    ), 0),
    lifetime_revenue_cents = COALESCE((SELECT sum(ps.amount_cents)::bigint FROM public.partner_sales ps WHERE ps.partner_id = p_partner_id), 0),
    updated_at = now()
  WHERE p.id = p_partner_id;
END;
$$;


-- ------------------------------------------------------------
-- 4) PERMISSÕES (executar SÓ depois das funções criadas acima)
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.calendar_events_check_overlap()                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_recompute_referral_link_stats()            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_partner_referral_link_stats(uuid)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_partner_totals(uuid)                 FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.resolve_partner_referral_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_partner_referral_link(text) TO anon, authenticated;


-- ------------------------------------------------------------
-- 5) BACKFILL das métricas existentes
-- ------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.partner_referral_links LOOP
    PERFORM public.recompute_partner_referral_link_stats(r.id);
  END LOOP;

  FOR r IN SELECT id FROM public.partners LOOP
    PERFORM public.recompute_partner_totals(r.id);
  END LOOP;
END $$;
