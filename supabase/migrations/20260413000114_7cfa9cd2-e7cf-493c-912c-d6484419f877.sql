
DROP TRIGGER IF EXISTS update_revenue_score_rules_updated_at ON public.revenue_score_rules;

CREATE TRIGGER update_revenue_score_rules_updated_at
BEFORE UPDATE ON public.revenue_score_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
