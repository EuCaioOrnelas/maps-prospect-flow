-- ============================================================
-- CRON: cleanup-campaign-drafts
-- Deleta rascunhos de campanha abandonados com mais de 30 minutos
-- ============================================================
-- Rode este SQL no seu banco de produção externo.
-- Ele cria (ou recria) o cron job chamando a edge function
-- com o header Authorization correto.
-- ============================================================

-- 1. Garante que as extensões necessárias estão habilitadas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remove cron anterior, caso exista (idempotente)
SELECT cron.unschedule('cleanup-campaign-drafts-hourly');

-- 3. Agenda a execução a cada 1 hora
-- Substitua <SUA_ANON_KEY> pela anon key do seu projeto Supabase.
-- Você encontra em Project Settings > API > anon public.
SELECT cron.schedule(
  'cleanup-campaign-drafts-hourly',
  '0 * * * *', -- toda hora, no minuto 0
  $$
  SELECT
    net.http_post(
      url := 'https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/cleanup-campaign-drafts',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2toa2F3amR4c212ZnVoYXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTIyODgsImV4cCI6MjA4ODI4ODI4OH0.zB0PjQDsitFoRn21HDvI7v7uRrTOpd3LdqFTW6mlGYI"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- 4. Confirma o agendamento
SELECT *
FROM cron.job
WHERE jobname = 'cleanup-campaign-drafts-hourly';
