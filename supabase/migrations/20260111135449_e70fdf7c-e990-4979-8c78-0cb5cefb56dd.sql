-- Drop the existing check constraint
ALTER TABLE public.warming_interactions DROP CONSTRAINT IF EXISTS warming_interactions_status_check;

-- Add updated check constraint with 'invalid_number' status
ALTER TABLE public.warming_interactions ADD CONSTRAINT warming_interactions_status_check 
CHECK (status IN ('pending', 'in_progress', 'pending_response', 'completed', 'failed', 'invalid_number'));