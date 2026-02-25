
-- Add new columns to revenue_events
ALTER TABLE public.revenue_events
  ADD COLUMN IF NOT EXISTS intent_category text,
  ADD COLUMN IF NOT EXISTS intent_subtype text,
  ADD COLUMN IF NOT EXISTS intent_confidence_score integer DEFAULT 0;

-- Create revenue_intent_logs table for audit
CREATE TABLE public.revenue_intent_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.revenue_leads(id) ON DELETE CASCADE,
  message_id text,
  raw_message text NOT NULL,
  intent_category text NOT NULL,
  intent_subtype text NOT NULL,
  matched_keywords text[] DEFAULT '{}',
  confidence_score integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.revenue_intent_logs ENABLE ROW LEVEL SECURITY;

-- RLS: service role (edge functions) can insert, users with admin can read
CREATE POLICY "Service role can insert intent logs"
  ON public.revenue_intent_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own intent logs"
  ON public.revenue_intent_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.revenue_leads rl
      WHERE rl.id = revenue_intent_logs.lead_id
      AND rl.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage intent logs"
  ON public.revenue_intent_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add index for fast lookups
CREATE INDEX idx_revenue_intent_logs_lead_id ON public.revenue_intent_logs(lead_id);
CREATE INDEX idx_revenue_intent_logs_category ON public.revenue_intent_logs(intent_category);

-- Add last_intent columns to revenue_leads for quick display
ALTER TABLE public.revenue_leads
  ADD COLUMN IF NOT EXISTS last_intent_category text,
  ADD COLUMN IF NOT EXISTS last_intent_subtype text;

-- Update seed function to include new rule keys
CREATE OR REPLACE FUNCTION public.seed_revenue_score_rules(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.revenue_score_rules (user_id, rule_key, points, cooldown_minutes, max_per_day) VALUES
    (p_user_id, 'INBOUND_MESSAGE', 12, 2, 30),
    (p_user_id, 'INBOUND_STREAK_3', 25, NULL, 1),
    (p_user_id, 'INBOUND_AFTER_24H_SILENCE', 30, NULL, NULL),
    (p_user_id, 'INBOUND_AFTER_7D_SILENCE', 60, NULL, NULL),
    (p_user_id, 'OUTBOUND_REPLY_RECEIVED_WITHIN_1H', 18, NULL, NULL),
    (p_user_id, 'INTENT_PRICE', 80, NULL, NULL),
    (p_user_id, 'INTENT_BUY_NOW', 140, NULL, NULL),
    (p_user_id, 'INTENT_AVAILABILITY', 70, NULL, NULL),
    (p_user_id, 'INTENT_PAYMENT', 90, NULL, NULL),
    (p_user_id, 'INTENT_PROPOSAL', 100, NULL, NULL),
    (p_user_id, 'INTENT_URGENT', 60, NULL, NULL),
    (p_user_id, 'INTENT_OBJECTION', -10, NULL, NULL),
    (p_user_id, 'INTENT_NEGATIVE_MODERATE', -80, NULL, NULL),
    (p_user_id, 'INTENT_NEGATIVE_HARD', -300, NULL, NULL),
    (p_user_id, 'LINK_CLICK', 35, NULL, NULL),
    (p_user_id, 'FORM_SUBMIT', 90, NULL, NULL),
    (p_user_id, 'CALL_REQUEST', 110, NULL, NULL),
    (p_user_id, 'SLA_FIRST_RESPONSE_UNDER_5MIN', 40, NULL, NULL),
    (p_user_id, 'SLA_FIRST_RESPONSE_5_TO_30MIN', 15, NULL, NULL),
    (p_user_id, 'SLA_FIRST_RESPONSE_OVER_30MIN', -40, NULL, NULL),
    (p_user_id, 'UNREPLIED_INBOUND_OVER_2H', -60, NULL, NULL),
    (p_user_id, 'UNREPLIED_INBOUND_OVER_24H', -140, NULL, NULL),
    (p_user_id, 'CONVERSATION_ACTIVE_3D', 55, NULL, 1),
    (p_user_id, 'CONVERSATION_ACTIVE_5D', 95, NULL, 1),
    (p_user_id, 'BACK_AND_FORTH_5_TURNS', 70, NULL, 1)
  ON CONFLICT (user_id, rule_key) DO NOTHING;
END;
$function$;
