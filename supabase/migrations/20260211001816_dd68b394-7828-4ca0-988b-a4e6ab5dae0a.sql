-- Add CRM stage configuration columns to ai_agents
ALTER TABLE public.ai_agents
ADD COLUMN crm_stage_on_new_lead TEXT DEFAULT 'Respondeu Mensagem',
ADD COLUMN crm_stage_on_reply TEXT DEFAULT 'Mensagem Enviada',
ADD COLUMN crm_stage_on_end TEXT DEFAULT NULL;