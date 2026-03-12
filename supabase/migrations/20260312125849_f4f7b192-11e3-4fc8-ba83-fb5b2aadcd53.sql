-- Fix all ai_agents daily_limit based on actual warming_sessions status
UPDATE ai_agents a
SET 
  daily_limit = CASE 
    WHEN ws.warming_status = 'hot' THEN 999999
    WHEN ws.warming_status = 'warm' THEN 100
    ELSE 20
  END,
  is_warmed = CASE WHEN ws.warming_status = 'hot' THEN true ELSE a.is_warmed END
FROM warming_sessions ws
WHERE ws.whatsapp_number_id = a.whatsapp_number_id
  AND ws.status IN ('completed', 'active')
  AND a.daily_limit < CASE 
    WHEN ws.warming_status = 'hot' THEN 999999
    WHEN ws.warming_status = 'warm' THEN 100
    ELSE 20
  END;