-- ============================================================
-- OTIMIZAÇÃO DEFINITIVA DOS AGENDAMENTOS (banco de produção)
-- Rode inteiro, de uma vez. Pode rodar mais de uma vez sem problema.
-- ============================================================

-- 1) Remover agendamento DUPLICADO:
--    'wa-flow-runner-tick-1min' e 'wa-flow-scheduler' chamam a MESMA tarefa
--    a cada minuto (2.880 chamadas/dia em vez de 1.440). Fica só um.
SELECT cron.unschedule('wa-flow-runner-tick-1min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wa-flow-runner-tick-1min');

-- 2) Agendamentos de minuto só "acordam" a função quando há trabalho.
--    Antes: chamavam a função 1.440 vezes/dia mesmo sem nada a fazer.
--    Agora: o banco faz uma checagem levíssima e só chama se houver pendência.
DO $$
DECLARE
  r record;
  base text;
  cond text;
BEGIN
  FOR r IN SELECT jobname, command FROM cron.job
           WHERE jobname IN ('sdr-followup-processor-every-minute',
                             'chat-scheduled-messages-every-minute')
  LOOP
    -- já otimizado antes? pula
    CONTINUE WHEN r.command LIKE '%-- wiize-gate%';

    IF r.jobname = 'sdr-followup-processor-every-minute' THEN
      cond := 'SELECT 1 FROM public.sdr_sessions WHERE next_followup_at IS NOT NULL AND next_followup_at <= now() LIMIT 1';
    ELSE
      cond := 'SELECT 1 FROM public.chat_scheduled_messages WHERE status = ''pending'' AND scheduled_at <= now() LIMIT 1';
    END IF;

    base := regexp_replace(btrim(r.command), ';\s*$', '');
    PERFORM cron.alter_job(
      (SELECT jobid FROM cron.job WHERE jobname = r.jobname),
      command := format(
        E'-- wiize-gate\nDO $g$ BEGIN IF EXISTS (%s) THEN PERFORM 1 FROM (%s) AS chamada; END IF; END $g$;',
        cond, base)
    );
  END LOOP;
END $$;

-- 3) Índices para essas checagens ficarem instantâneas
CREATE INDEX IF NOT EXISTS idx_sdr_sessions_next_followup
  ON public.sdr_sessions (next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_scheduled_pending
  ON public.chat_scheduled_messages (scheduled_at) WHERE status = 'pending';

-- 4) Limpeza automática diária do histórico dos agendamentos
--    (a tabela que chegou a 22 mil linhas nunca mais cresce sem controle)
SELECT cron.unschedule('cleanup-cron-history-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-cron-history-daily');
SELECT cron.schedule('cleanup-cron-history-daily', '20 4 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days'$$);

-- 5) Conferência final
SELECT jobname, schedule, active,
       command LIKE '%-- wiize-gate%' AS so_roda_com_trabalho
FROM cron.job
WHERE schedule = '* * * * *' OR jobname = 'cleanup-cron-history-daily'
ORDER BY jobname;
