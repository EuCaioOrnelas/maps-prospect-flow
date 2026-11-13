-- =============================================================
-- Evolução do SDR Inteligente — Catálogo comercial, elegibilidade
-- e eventos de venda (Fases 2 e 4 — base de dados)
-- Idempotente e aditiva: nada existente é removido ou alterado.
-- =============================================================

-- ---------- 1. Catálogo de produtos/serviços para o SDR ----------
CREATE TABLE IF NOT EXISTS public.sdr_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  image_url text,
  segments text[] DEFAULT '{}',
  problems_solved text,
  benefits text,
  differentials text,
  price_type text NOT NULL DEFAULT 'fixed',
  price_value numeric,
  price_min numeric,
  price_max numeric,
  price_display text,
  billing_model text NOT NULL DEFAULT 'unico',
  installments text,
  payment_conditions text,
  max_discount_percent numeric DEFAULT 0,
  negotiation_rules text,
  delivery_estimate text,
  hiring_conditions text,
  sales_arguments text,
  objections jsonb DEFAULT '[]',
  qualification_questions text[] DEFAULT '{}',
  target_audience text,
  priority_segments text[] DEFAULT '{}',
  requirements text,
  when_to_offer text,
  when_not_to_offer text,
  full_description text,
  priority text NOT NULL DEFAULT 'media',
  proposal_file jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sdr_products TO authenticated;
GRANT ALL ON public.sdr_products TO service_role;

ALTER TABLE public.sdr_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sdr_products_select ON public.sdr_products;
CREATE POLICY sdr_products_select ON public.sdr_products
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

DROP POLICY IF EXISTS sdr_products_insert ON public.sdr_products;
CREATE POLICY sdr_products_insert ON public.sdr_products
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

DROP POLICY IF EXISTS sdr_products_update ON public.sdr_products;
CREATE POLICY sdr_products_update ON public.sdr_products
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

DROP POLICY IF EXISTS sdr_products_delete ON public.sdr_products;
CREATE POLICY sdr_products_delete ON public.sdr_products
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS sdr_products_owner_idx ON public.sdr_products (owner_user_id, active);

-- ---------- 2. Seleção de produtos por agente ----------
CREATE TABLE IF NOT EXISTS public.sdr_agent_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.sdr_agents(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.sdr_products(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  priority text NOT NULL DEFAULT 'media',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sdr_agent_products TO authenticated;
GRANT ALL ON public.sdr_agent_products TO service_role;

ALTER TABLE public.sdr_agent_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sdr_agent_products_select ON public.sdr_agent_products;
CREATE POLICY sdr_agent_products_select ON public.sdr_agent_products
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

DROP POLICY IF EXISTS sdr_agent_products_insert ON public.sdr_agent_products;
CREATE POLICY sdr_agent_products_insert ON public.sdr_agent_products
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

DROP POLICY IF EXISTS sdr_agent_products_update ON public.sdr_agent_products;
CREATE POLICY sdr_agent_products_update ON public.sdr_agent_products
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

DROP POLICY IF EXISTS sdr_agent_products_delete ON public.sdr_agent_products;
CREATE POLICY sdr_agent_products_delete ON public.sdr_agent_products
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS sdr_agent_products_agent_idx ON public.sdr_agent_products (agent_id);

-- ---------- 3. Eventos comerciais do SDR (rastreabilidade) ----------
CREATE TABLE IF NOT EXISTS public.sdr_sales_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  agent_id uuid REFERENCES public.sdr_agents(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sdr_sessions(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.sdr_products(id) ON DELETE SET NULL,
  lead_id uuid,
  event_type text NOT NULL,
  details jsonb DEFAULT '{}',
  value numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sdr_sales_events TO authenticated;
GRANT ALL ON public.sdr_sales_events TO service_role;

ALTER TABLE public.sdr_sales_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sdr_sales_events_select ON public.sdr_sales_events;
CREATE POLICY sdr_sales_events_select ON public.sdr_sales_events
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

DROP POLICY IF EXISTS sdr_sales_events_insert ON public.sdr_sales_events;
CREATE POLICY sdr_sales_events_insert ON public.sdr_sales_events
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS sdr_sales_events_owner_idx ON public.sdr_sales_events (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sdr_sales_events_agent_idx ON public.sdr_sales_events (agent_id, event_type);

-- ---------- 4. Log de elegibilidade (auditoria do motor) ----------
CREATE TABLE IF NOT EXISTS public.sdr_eligibility_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  agent_id uuid REFERENCES public.sdr_agents(id) ON DELETE CASCADE,
  phone text,
  lead_id uuid,
  eligible boolean NOT NULL,
  reason text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sdr_eligibility_log TO authenticated;
GRANT ALL ON public.sdr_eligibility_log TO service_role;

ALTER TABLE public.sdr_eligibility_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sdr_eligibility_log_select ON public.sdr_eligibility_log;
CREATE POLICY sdr_eligibility_log_select ON public.sdr_eligibility_log
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = get_account_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS sdr_eligibility_log_owner_idx ON public.sdr_eligibility_log (owner_user_id, created_at DESC);

-- ---------- 5. Novas colunas do agente (modo de operação e ativação) ----------
ALTER TABLE public.sdr_agents ADD COLUMN IF NOT EXISTS operation_mode text NOT NULL DEFAULT 'tradicional';
ALTER TABLE public.sdr_agents ADD COLUMN IF NOT EXISTS offer_strategy text NOT NULL DEFAULT 'inteligente';
ALTER TABLE public.sdr_agents ADD COLUMN IF NOT EXISTS activation_mode text NOT NULL DEFAULT 'todos';
ALTER TABLE public.sdr_agents ADD COLUMN IF NOT EXISTS allowed_origins text[];
ALTER TABLE public.sdr_agents ADD COLUMN IF NOT EXISTS exclude_crm boolean NOT NULL DEFAULT false;
ALTER TABLE public.sdr_agents ADD COLUMN IF NOT EXISTS exclude_clients boolean NOT NULL DEFAULT false;
ALTER TABLE public.sdr_agents ADD COLUMN IF NOT EXISTS exclude_human_owned boolean NOT NULL DEFAULT false;
ALTER TABLE public.sdr_agents ADD COLUMN IF NOT EXISTS sales_behavior jsonb NOT NULL DEFAULT '{}';

-- ---------- 6. Novas colunas da sessão (produto e valor potencial) ----------
ALTER TABLE public.sdr_sessions ADD COLUMN IF NOT EXISTS selected_product_id uuid;
ALTER TABLE public.sdr_sessions ADD COLUMN IF NOT EXISTS potential_value numeric;

-- ---------- 7. Motor de elegibilidade (backend, fail-closed) ----------
CREATE OR REPLACE FUNCTION public.sdr_check_eligibility(
  p_agent_id uuid,
  p_phone text,
  p_trigger text DEFAULT 'inbound'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent public.sdr_agents%ROWTYPE;
  v_tail text;
  v_lead record;
  v_has_deal boolean;
  v_session record;
  v_origin text;
  v_allowed boolean;
BEGIN
  SELECT * INTO v_agent FROM public.sdr_agents WHERE id = p_agent_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'agent_not_found');
  END IF;

  v_tail := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8);
  IF length(v_tail) < 8 THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'invalid_phone');
  END IF;

  SELECT * INTO v_session
  FROM public.sdr_sessions
  WHERE agent_id = p_agent_id AND phone ILIKE '%' || v_tail
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_session.id IS NOT NULL AND v_session.status IN ('opted_out', 'paused', 'handoff') THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'session_' || v_session.status, 'session_id', v_session.id);
  END IF;
  IF v_session.id IS NOT NULL AND v_session.status IN ('closed', 'won')
     AND coalesce(v_session.closed_reason, '') IN ('explicit_opt_out', 'explicit_rejection', 'lead_refused', 'objective_completed') THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'session_closed_' || v_session.closed_reason, 'session_id', v_session.id);
  END IF;

  SELECT id, origin, pipeline_stage_id, responsible_user_id
  INTO v_lead
  FROM public.leads
  WHERE (owner_user_id = v_agent.owner_user_id OR user_id = v_agent.owner_user_id)
    AND phone ILIKE '%' || v_tail
  ORDER BY created_at DESC
  LIMIT 1;

  v_origin := coalesce(v_lead.origin, 'desconhecido');

  IF v_agent.activation_mode = 'oportunidades' THEN
    IF v_lead.id IS NULL OR v_origin NOT IN ('oportunidades', 'prospeccao') THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'origin_not_opportunity', 'origin', v_origin, 'lead_id', v_lead.id);
    END IF;
  ELSIF v_agent.activation_mode = 'oportunidades_novos' THEN
    IF v_lead.id IS NOT NULL AND v_origin NOT IN ('oportunidades', 'prospeccao') THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'origin_not_allowed', 'origin', v_origin, 'lead_id', v_lead.id);
    END IF;
  ELSIF v_agent.activation_mode = 'personalizado' THEN
    v_allowed := v_lead.id IS NOT NULL AND v_origin = ANY(coalesce(v_agent.allowed_origins, '{}'));
    IF NOT v_allowed THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'origin_not_in_custom_list', 'origin', v_origin, 'lead_id', v_lead.id);
    END IF;
  END IF;

  IF v_lead.id IS NOT NULL THEN
    IF v_agent.exclude_crm AND v_origin NOT IN ('oportunidades', 'prospeccao') THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'excluded_crm_contact', 'lead_id', v_lead.id);
    END IF;

    IF v_agent.exclude_clients THEN
      SELECT EXISTS (
        SELECT 1 FROM public.lead_deals d
        WHERE d.lead_id = v_lead.id
          AND coalesce(d.status, '') NOT IN ('cancelled', 'canceled', 'lost', 'refunded')
      ) INTO v_has_deal;
      IF v_has_deal THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'excluded_existing_client', 'lead_id', v_lead.id);
      END IF;
    END IF;

    IF v_agent.exclude_human_owned AND v_lead.responsible_user_id IS NOT NULL
       AND v_origin NOT IN ('oportunidades', 'prospeccao') THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'excluded_human_owned', 'lead_id', v_lead.id);
    END IF;
  END IF;

  RETURN jsonb_build_object('eligible', true, 'reason', 'ok', 'origin', v_origin, 'lead_id', v_lead.id, 'session_id', v_session.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sdr_check_eligibility(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_check_eligibility(uuid, text, text) TO authenticated;

-- ---------- 8. Registro de evento comercial (uso interno) ----------
CREATE OR REPLACE FUNCTION public.sdr_log_sales_event(
  p_owner_user_id uuid,
  p_agent_id uuid,
  p_session_id uuid,
  p_product_id uuid,
  p_event_type text,
  p_details jsonb DEFAULT '{}',
  p_value numeric DEFAULT NULL,
  p_lead_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.sdr_sales_events (owner_user_id, agent_id, session_id, product_id, event_type, details, value, lead_id)
  VALUES (p_owner_user_id, p_agent_id, p_session_id, p_product_id, p_event_type, coalesce(p_details, '{}'), p_value, p_lead_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sdr_log_sales_event(uuid, uuid, uuid, uuid, text, jsonb, numeric, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_log_sales_event(uuid, uuid, uuid, uuid, text, jsonb, numeric, uuid) TO authenticated;