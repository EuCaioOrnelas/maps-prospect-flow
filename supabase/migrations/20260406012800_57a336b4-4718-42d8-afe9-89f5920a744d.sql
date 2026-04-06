
UPDATE public.revenue_score_rules SET max_per_day = 5 WHERE rule_key = 'INBOUND_STREAK_3';
UPDATE public.revenue_score_rules SET max_per_day = 3 WHERE rule_key = 'CONVERSATION_ACTIVE_3D';
UPDATE public.revenue_score_rules SET max_per_day = 3 WHERE rule_key = 'CONVERSATION_ACTIVE_5D';
UPDATE public.revenue_score_rules SET max_per_day = 5 WHERE rule_key = 'BACK_AND_FORTH_5_TURNS';
