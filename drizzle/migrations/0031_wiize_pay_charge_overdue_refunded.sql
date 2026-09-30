ALTER TABLE public.wiize_pay_charge_requests DROP CONSTRAINT IF EXISTS wiize_pay_charge_requests_status_check;
ALTER TABLE public.wiize_pay_charge_requests ADD CONSTRAINT wiize_pay_charge_requests_status_check
  CHECK (status = ANY (ARRAY['draft','awaiting_wiize_pay','sent','awaiting_payment','overdue','paid','refunded','cancelled','error']));