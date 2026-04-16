-- Adiciona regras de score para novas páginas/features
INSERT INTO public.score_rules (event_name, category, points, is_negative, is_active, apply_decay, max_applications_per_period, period_type, description) VALUES
  -- WhatsApp Flows (Automações)
  ('wa_flow_page_viewed', 'engagement', 1, false, true, true, 3, 'day', 'Página de fluxos WhatsApp visualizada'),
  ('wa_flow_created', 'value', 6, false, true, true, 3, 'week', 'Fluxo de WhatsApp criado'),
  ('wa_flow_published', 'value', 8, false, true, true, 3, 'week', 'Fluxo de WhatsApp publicado/ativado'),
  ('wa_flow_ai_generated', 'value', 7, false, true, true, 3, 'day', 'Fluxo gerado por IA'),
  ('wa_flow_test_executed', 'engagement', 2, false, true, true, 5, 'day', 'Teste de fluxo executado'),

  -- Meta Campaigns
  ('meta_campaigns_page_viewed', 'engagement', 1, false, true, true, 3, 'day', 'Página de campanhas Meta visualizada'),
  ('meta_account_connected', 'value', 8, false, true, true, 1, 'month', 'Conta Meta WhatsApp conectada'),
  ('meta_campaign_created', 'value', 6, false, true, true, 5, 'week', 'Campanha Meta criada'),
  ('meta_campaign_sent', 'value', 8, false, true, true, 5, 'week', 'Campanha Meta enviada'),

  -- Opportunities Management (Gestão de oportunidades)
  ('opportunities_page_viewed', 'engagement', 1, false, true, true, 3, 'day', 'Página de gestão de oportunidades visualizada'),
  ('opportunity_lead_qualified', 'value', 4, false, true, true, 10, 'day', 'Lead qualificado pela IA'),
  ('opportunity_message_sent', 'value', 5, false, true, true, 20, 'day', 'Mensagem enviada para oportunidade'),
  ('opportunity_company_profile_filled', 'activation', 5, false, true, true, 1, 'month', 'Perfil de empresa para oportunidades preenchido'),

  -- New Main Dashboard (Cockpit)
  ('cockpit_dashboard_viewed', 'engagement', 1, false, true, true, 1, 'day', 'Dashboard cockpit visualizado'),
  ('cockpit_quick_action_used', 'engagement', 2, false, true, true, 5, 'day', 'Ação rápida do cockpit utilizada'),
  ('cockpit_forecast_viewed', 'purchase_intent', 2, false, true, true, 2, 'week', 'Forecast/projeção de receita visualizada'),

  -- Chat Wiize
  ('chat_page_viewed', 'engagement', 1, false, true, true, 3, 'day', 'Chat Wiize visualizado'),
  ('chat_message_sent', 'value', 3, false, true, true, 20, 'day', 'Mensagem enviada via Chat Wiize'),

  -- AI Agents (página dedicada)
  ('ai_agent_page_viewed', 'engagement', 1, false, true, true, 3, 'day', 'Página de Agentes IA visualizada'),
  ('ai_agent_published', 'value', 6, false, true, true, 3, 'week', 'Agente IA ativado/publicado'),
  ('ai_agent_test_chat_used', 'engagement', 2, false, true, true, 5, 'day', 'Chat de teste do agente utilizado'),

  -- CRM Score
  ('crm_score_page_viewed', 'engagement', 1, false, true, true, 3, 'day', 'Página CRM Score visualizada'),
  ('lead_high_score_reached', 'value', 4, false, true, true, 10, 'day', 'Lead atingiu score alto (>700)')
ON CONFLICT (event_name) DO UPDATE SET
  category = EXCLUDED.category,
  points = EXCLUDED.points,
  description = EXCLUDED.description,
  max_applications_per_period = EXCLUDED.max_applications_per_period,
  period_type = EXCLUDED.period_type,
  apply_decay = EXCLUDED.apply_decay,
  is_active = EXCLUDED.is_active,
  updated_at = now();