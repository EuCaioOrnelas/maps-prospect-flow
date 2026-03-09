
-- Trial Message Templates
CREATE TABLE public.trial_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  channel TEXT NOT NULL DEFAULT 'email',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trial_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  automation_type TEXT NOT NULL DEFAULT 'time_based',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trial_automation_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES public.trial_automations(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL DEFAULT 'send_email',
  template_id UUID REFERENCES public.trial_message_templates(id) ON DELETE SET NULL,
  stop_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trial_user_automation_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  automation_id UUID NOT NULL REFERENCES public.trial_automations(id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES public.trial_automation_steps(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  next_step_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trial_product_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  event_source TEXT NOT NULL DEFAULT 'product',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trial_email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_template_id UUID REFERENCES public.trial_message_templates(id) ON DELETE SET NULL,
  automation_id UUID REFERENCES public.trial_automations(id) ON DELETE SET NULL,
  step_id UUID REFERENCES public.trial_automation_steps(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trial_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_template_id UUID REFERENCES public.trial_message_templates(id) ON DELETE SET NULL,
  automation_id UUID REFERENCES public.trial_automations(id) ON DELETE SET NULL,
  step_id UUID REFERENCES public.trial_automation_steps(id) ON DELETE SET NULL,
  link_id TEXT,
  redirect_url TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trial_revenue_attribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id TEXT,
  email_template_id UUID REFERENCES public.trial_message_templates(id) ON DELETE SET NULL,
  automation_id UUID REFERENCES public.trial_automations(id) ON DELETE SET NULL,
  step_id UUID REFERENCES public.trial_automation_steps(id) ON DELETE SET NULL,
  revenue_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trial_behaviour_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'behaviour',
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  entry_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  cooldown_hours INTEGER NOT NULL DEFAULT 168,
  priority INTEGER NOT NULL DEFAULT 50,
  target_automation_id UUID REFERENCES public.trial_automations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  success_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  stop_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trial_behaviour_trigger_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_id UUID NOT NULL REFERENCES public.trial_behaviour_triggers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_activation_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  step_prospect_clients_completed BOOLEAN NOT NULL DEFAULT false,
  step_first_campaign_completed BOOLEAN NOT NULL DEFAULT false,
  step_scheduled_campaign_completed BOOLEAN NOT NULL DEFAULT false,
  step_explore_ai_crm_completed BOOLEAN NOT NULL DEFAULT false,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  activation_completed BOOLEAN NOT NULL DEFAULT false,
  first_activation_at TIMESTAMP WITH TIME ZONE,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trial_activation_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_type TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(config_type, config_key)
);

-- Indexes
CREATE INDEX idx_trial_product_events_user ON public.trial_product_events(user_id, event_name);
CREATE INDEX idx_trial_product_events_created ON public.trial_product_events(created_at);
CREATE INDEX idx_trial_email_events_user ON public.trial_email_events(user_id, event_type);
CREATE INDEX idx_trial_user_automation_state_user ON public.trial_user_automation_state(user_id, status);
CREATE INDEX idx_trial_behaviour_trigger_logs_trigger ON public.trial_behaviour_trigger_logs(trigger_id, user_id);
CREATE INDEX idx_user_activation_progress_user ON public.user_activation_progress(user_id);
CREATE INDEX idx_trial_link_clicks_user ON public.trial_link_clicks(user_id);

-- RLS
ALTER TABLE public.trial_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_user_automation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_revenue_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_behaviour_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_behaviour_trigger_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activation_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_activation_config ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage templates" ON public.trial_message_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage automations" ON public.trial_automations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage automation steps" ON public.trial_automation_steps FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage behaviour triggers" ON public.trial_behaviour_triggers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage activation config" ON public.trial_activation_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all email events" ON public.trial_email_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all product events" ON public.trial_product_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all link clicks" ON public.trial_link_clicks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all revenue attribution" ON public.trial_revenue_attribution FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all automation state" ON public.trial_user_automation_state FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all trigger logs" ON public.trial_behaviour_trigger_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User policies
CREATE POLICY "Users can view own activation progress" ON public.user_activation_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activation progress" ON public.user_activation_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activation progress" ON public.user_activation_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service can insert product events" ON public.trial_product_events FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can view own product events" ON public.trial_product_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service can insert email events" ON public.trial_email_events FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Service can insert link clicks" ON public.trial_link_clicks FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Service can insert revenue attribution" ON public.trial_revenue_attribution FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Service can manage automation state" ON public.trial_user_automation_state FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Service can insert trigger logs" ON public.trial_behaviour_trigger_logs FOR INSERT TO public WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trial_product_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activation_progress;
