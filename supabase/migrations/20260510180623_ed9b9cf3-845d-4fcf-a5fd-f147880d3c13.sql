-- ============================================
-- Fase 1 — Fundação: state machine, frustração, summary, custo
-- Idempotente
-- ============================================

-- 1. Atualiza customer_type para usar trial_user (não registered_user)
ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_customer_type_check;

UPDATE public.support_tickets
  SET customer_type = 'trial_user'
  WHERE customer_type = 'registered_user';

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_customer_type_check
  CHECK (customer_type = ANY (ARRAY['paid_client'::text, 'trial_user'::text, 'guest'::text]));

-- 2. State machine
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'triage';

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_phase_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_phase_check
  CHECK (phase = ANY (ARRAY[
    'triage','faq_resolution','ai_investigating','ai_solution',
    'waiting_user_confirmation','escalated','human_assigned',
    'resolved','closed','rated'
  ]));

CREATE INDEX IF NOT EXISTS idx_support_tickets_phase ON public.support_tickets(phase);

-- 3. Frustration score (0-100)
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS frustration_score integer NOT NULL DEFAULT 0;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_frustration_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_frustration_check
  CHECK (frustration_score >= 0 AND frustration_score <= 100);

CREATE INDEX IF NOT EXISTS idx_support_tickets_frustration
  ON public.support_tickets(frustration_score DESC)
  WHERE frustration_score >= 40;

-- 4. Memory summary progressivo
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS conversation_summary text;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS summary_message_count integer NOT NULL DEFAULT 0;

-- 5. Cost tracking em ai_logs (cents calculados via trigger — não generated por causa de stable cost table)
ALTER TABLE public.ai_logs
  ADD COLUMN IF NOT EXISTS cost_usd numeric(12,8);

-- gpt-4o-mini: input $0.150 / 1M tokens, output $0.600 / 1M tokens
CREATE OR REPLACE FUNCTION public.compute_ai_log_cost()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.cost_usd := COALESCE(NEW.tokens_in, 0) * 0.00000015
                + COALESCE(NEW.tokens_out, 0) * 0.00000060;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_ai_log_cost ON public.ai_logs;
CREATE TRIGGER trg_compute_ai_log_cost
  BEFORE INSERT OR UPDATE OF tokens_in, tokens_out ON public.ai_logs
  FOR EACH ROW EXECUTE FUNCTION public.compute_ai_log_cost();

-- backfill custos existentes
UPDATE public.ai_logs
  SET cost_usd = COALESCE(tokens_in,0) * 0.00000015 + COALESCE(tokens_out,0) * 0.00000060
  WHERE cost_usd IS NULL;

-- 6. Nova tabela support_ticket_events (audit de transições)
CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  from_phase text,
  to_phase text NOT NULL,
  triggered_by text NOT NULL DEFAULT 'system',  -- system | user | ai | admin
  actor_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ticket
  ON public.support_ticket_events(ticket_id, created_at DESC);

ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_events_admin_all" ON public.support_ticket_events;
CREATE POLICY "ticket_events_admin_all"
  ON public.support_ticket_events
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "ticket_events_public_insert" ON public.support_ticket_events;
CREATE POLICY "ticket_events_public_insert"
  ON public.support_ticket_events
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "ticket_events_owner_select" ON public.support_ticket_events;
CREATE POLICY "ticket_events_owner_select"
  ON public.support_ticket_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- 7. Views de custo
CREATE OR REPLACE VIEW public.support_cost_by_ticket AS
SELECT
  t.id AS ticket_id,
  t.ticket_number,
  t.user_id,
  t.category,
  t.customer_type,
  t.phase,
  t.created_at,
  COALESCE(SUM(l.cost_usd), 0) AS total_cost_usd,
  COALESCE(SUM(l.tokens_in), 0) AS total_tokens_in,
  COALESCE(SUM(l.tokens_out), 0) AS total_tokens_out,
  COUNT(l.id) AS ai_calls
FROM public.support_tickets t
LEFT JOIN public.ai_logs l ON l.ticket_id = t.id
GROUP BY t.id;

CREATE OR REPLACE VIEW public.support_cost_by_user AS
SELECT
  t.user_id,
  COUNT(DISTINCT t.id) AS tickets,
  COALESCE(SUM(l.cost_usd), 0) AS total_cost_usd,
  COALESCE(SUM(l.tokens_in), 0) AS total_tokens_in,
  COALESCE(SUM(l.tokens_out), 0) AS total_tokens_out
FROM public.support_tickets t
LEFT JOIN public.ai_logs l ON l.ticket_id = t.id
WHERE t.user_id IS NOT NULL
GROUP BY t.user_id;

CREATE OR REPLACE VIEW public.support_cost_by_category AS
SELECT
  COALESCE(t.category, 'sem_categoria') AS category,
  COUNT(DISTINCT t.id) AS tickets,
  COALESCE(SUM(l.cost_usd), 0) AS total_cost_usd,
  COALESCE(AVG(l.cost_usd), 0) AS avg_cost_per_call
FROM public.support_tickets t
LEFT JOIN public.ai_logs l ON l.ticket_id = t.id
GROUP BY t.category;