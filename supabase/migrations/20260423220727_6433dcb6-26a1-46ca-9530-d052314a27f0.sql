-- Triggers de reconciliação automática de pagamentos
DROP TRIGGER IF EXISTS trg_reconcile_paid_lead_to_user ON public.checkout_leads;
CREATE TRIGGER trg_reconcile_paid_lead_to_user
BEFORE INSERT OR UPDATE OF checkout_completed, user_id, email, phone, tax_id, stripe_session_id, plan_attempted
ON public.checkout_leads
FOR EACH ROW
EXECUTE FUNCTION public.reconcile_paid_lead_to_user();

DROP TRIGGER IF EXISTS trg_activate_pending_checkout ON public.profiles;
CREATE TRIGGER trg_activate_pending_checkout
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.activate_pending_checkout();