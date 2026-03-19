
-- Add crm_stage_on_lost column to ai_agents for "lead perdido" classification
ALTER TABLE public.ai_agents 
  ADD COLUMN IF NOT EXISTS crm_stage_on_lost text DEFAULT NULL;

COMMENT ON COLUMN public.ai_agents.crm_stage_on_lost IS 'CRM pipeline stage name to move leads when classified as lost/not interested';
