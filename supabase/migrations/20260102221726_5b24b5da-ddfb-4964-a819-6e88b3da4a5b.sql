-- Create table for rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  endpoint text NOT NULL, -- Function name
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON public.rate_limits(identifier, endpoint, window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer DEFAULT 60,
  p_window_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamp with time zone;
  v_current_count integer;
  v_record_id uuid;
BEGIN
  -- Calculate window start
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Get current count for this identifier/endpoint in the window
  SELECT id, request_count INTO v_record_id, v_current_count
  FROM public.rate_limits
  WHERE identifier = p_identifier 
    AND endpoint = p_endpoint
    AND window_start > v_window_start
  ORDER BY window_start DESC
  LIMIT 1;
  
  -- Check if limit exceeded
  IF v_current_count IS NOT NULL AND v_current_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_current_count,
      'max_requests', p_max_requests,
      'retry_after', p_window_seconds
    );
  END IF;
  
  -- Update or insert rate limit record
  IF v_record_id IS NOT NULL THEN
    UPDATE public.rate_limits 
    SET request_count = request_count + 1
    WHERE id = v_record_id;
    v_current_count := v_current_count + 1;
  ELSE
    INSERT INTO public.rate_limits (identifier, endpoint, window_start)
    VALUES (p_identifier, p_endpoint, now());
    v_current_count := 1;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_current_count,
    'max_requests', p_max_requests,
    'remaining', p_max_requests - v_current_count
  );
END;
$$;

-- Cleanup function for old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;