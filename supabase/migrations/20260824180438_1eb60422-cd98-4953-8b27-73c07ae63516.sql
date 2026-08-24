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
    total_leads = COALESCE((SELECT count(*)::int FROM public.partner_leads pl WHERE pl.partner_id = p_partner_id), 0),
    total_paid_clients = COALESCE((SELECT count(*)::int FROM public.partner_leads pl WHERE pl.partner_id = p_partner_id AND pl.is_paid = true AND pl.is_cancelled = false), 0),
    lifetime_revenue_cents = COALESCE((SELECT sum(ps.amount_cents)::bigint FROM public.partner_sales ps WHERE ps.partner_id = p_partner_id), 0),
    updated_at = now()
  WHERE p.id = p_partner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_partner_totals(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_recompute_partner_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN PERFORM public.recompute_partner_totals(OLD.partner_id); END IF;
  IF TG_OP <> 'DELETE' THEN PERFORM public.recompute_partner_totals(NEW.partner_id); END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_recompute_partner_totals() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_partner_clicks_totals ON public.partner_clicks;
CREATE TRIGGER trg_partner_clicks_totals
AFTER INSERT OR DELETE ON public.partner_clicks
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_partner_totals();

DROP TRIGGER IF EXISTS trg_partner_leads_totals ON public.partner_leads;
CREATE TRIGGER trg_partner_leads_totals
AFTER INSERT OR DELETE OR UPDATE OF is_paid, is_cancelled, partner_id ON public.partner_leads
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_partner_totals();

DROP TRIGGER IF EXISTS trg_partner_sales_totals ON public.partner_sales;
CREATE TRIGGER trg_partner_sales_totals
AFTER INSERT OR DELETE OR UPDATE OF amount_cents, partner_id ON public.partner_sales
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_partner_totals();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.partners LOOP
    PERFORM public.recompute_partner_totals(r.id);
  END LOOP;
END $$;