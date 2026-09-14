CREATE INDEX IF NOT EXISTS idx_wa_flow_executions_trigger_ref
ON public.wa_flow_executions (flow_id, ((trigger_data ->> 'trigger_ref')))
WHERE trigger_data ? 'trigger_ref';