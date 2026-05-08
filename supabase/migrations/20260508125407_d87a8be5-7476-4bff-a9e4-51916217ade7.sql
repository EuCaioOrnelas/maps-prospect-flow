ALTER TABLE public.support_tickets 
  ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'guest' 
    CHECK (customer_type IN ('paid_client','registered_user','guest'));