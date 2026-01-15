-- Add unique constraint for pipeline_stages name per user
ALTER TABLE public.pipeline_stages
ADD CONSTRAINT pipeline_stages_user_id_name_unique UNIQUE (user_id, name);