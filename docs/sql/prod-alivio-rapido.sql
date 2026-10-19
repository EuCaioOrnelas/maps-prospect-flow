-- ============================================================
-- ALÍVIO RÁPIDO DO BANCO DE PRODUÇÃO (rode com o banco sobrecarregado)
-- Cada bloco é curto e independente: rode UM POR VEZ, nessa ordem.
-- Se um bloco der timeout, espere 1 minuto e rode o próximo.
-- ============================================================

-- BLOCO 1 — Pausar a sincronização automática de clientes WiizePay
-- (a fila continua guardada; nada é perdido; dá para religar depois)
SELECT cron.alter_job('wiize-pay-customer-sync', active := false);

-- BLOCO 2 — Pausar outros agendamentos pesados por algumas horas
-- (descomente só os que existirem no seu banco; veja os nomes com:
--  SELECT jobname, schedule, active FROM cron.job;)
-- SELECT cron.alter_job('evolution-keepalive-5min', active := false);
-- SELECT cron.alter_job('wa-flow-runner-tick-1min', active := false);
-- SELECT cron.alter_job('intel-engine-sweep-daily', active := false);

-- BLOCO 3 — Limpar o histórico de execuções dos agendamentos
-- (essa tabela cresce sem parar e deixa tudo lento)
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '1 day';

-- BLOCO 4 — Ver o que está prendendo o banco AGORA
SELECT state, left(query, 120) AS consulta, now() - query_start AS tempo
FROM pg_stat_activity
WHERE datname = current_database() AND state <> 'idle'
ORDER BY tempo DESC NULLS LAST
LIMIT 10;

-- ============================================================
-- PARA RELIGAR a sincronização WiizePay depois que estabilizar:
-- SELECT cron.alter_job('wiize-pay-customer-sync', active := true);
-- ============================================================
