INSERT INTO score_rules (event_name, category, points, is_active, is_negative, max_applications_per_period, period_type, description, apply_decay)
VALUES ('leads_searched', 'engagement', 2, true, false, 3, 'day', 'Usuário realizou uma busca de leads', true)
ON CONFLICT DO NOTHING;