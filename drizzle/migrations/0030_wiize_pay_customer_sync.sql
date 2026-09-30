CREATE TABLE IF NOT EXISTS public.wiize_pay_customer_sync_queue (
  lead_id uuid PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.wiize_pay_customer_sync_queue TO service_role;
ALTER TABLE public.wiize_pay_customer_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS wpcsq_due_idx ON public.wiize_pay_customer_sync_queue (next_attempt_at);
CREATE INDEX IF NOT EXISTS wpcsq_owner_idx ON public.wiize_pay_customer_sync_queue (owner_user_id);

CREATE TABLE IF NOT EXISTS public.wiize_pay_sync_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cron_secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex')
);
GRANT ALL ON public.wiize_pay_sync_config TO service_role;
ALTER TABLE public.wiize_pay_sync_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.wiize_pay_sync_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Acorda o processador (uma chamada por comando, não por linha).
CREATE OR REPLACE FUNCTION public.wiize_pay_wake_customer_sync()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/wiize-pay-customers',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(SELECT cron_secret FROM wiize_pay_sync_config WHERE id = 1)),
    body := '{"action":"process_queue"}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.wiize_pay_wake_customer_sync() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.wiize_pay_enqueue_customer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_user_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND
     (NEW.company_name, NEW.contact_name, NEW.email, NEW.phone, NEW.document, NEW.address, NEW.city, NEW.region)
     IS NOT DISTINCT FROM
     (OLD.company_name, OLD.contact_name, OLD.email, OLD.phone, OLD.document, OLD.address, OLD.city, OLD.region)
  THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM integration_connections c WHERE c.owner_user_id = NEW.owner_user_id AND c.status = 'active') THEN
    INSERT INTO wiize_pay_customer_sync_queue (lead_id, owner_user_id)
    VALUES (NEW.id, NEW.owner_user_id)
    ON CONFLICT (lead_id) DO UPDATE SET attempts = 0, next_attempt_at = now(), last_error = NULL, updated_at = now();
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.wiize_pay_enqueue_customer() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.wiize_pay_wake_after_statement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM wiize_pay_customer_sync_queue WHERE next_attempt_at <= now() AND updated_at >= now() - interval '5 seconds') THEN
    PERFORM wiize_pay_wake_customer_sync();
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.wiize_pay_wake_after_statement() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_wiize_pay_enqueue_customer ON public.leads;
CREATE TRIGGER trg_wiize_pay_enqueue_customer
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.wiize_pay_enqueue_customer();

DROP TRIGGER IF EXISTS trg_wiize_pay_wake_leads ON public.leads;
CREATE TRIGGER trg_wiize_pay_wake_leads
AFTER INSERT OR UPDATE ON public.leads
FOR EACH STATEMENT EXECUTE FUNCTION public.wiize_pay_wake_after_statement();

CREATE OR REPLACE FUNCTION public.wiize_pay_enqueue_all_on_connect()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    INSERT INTO wiize_pay_customer_sync_queue (lead_id, owner_user_id)
    SELECT id, owner_user_id FROM leads WHERE owner_user_id = NEW.owner_user_id
    ON CONFLICT (lead_id) DO UPDATE SET attempts = 0, next_attempt_at = now(), last_error = NULL, updated_at = now();
    PERFORM wiize_pay_wake_customer_sync();
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.wiize_pay_enqueue_all_on_connect() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_wiize_pay_enqueue_all_on_connect ON public.integration_connections;
CREATE TRIGGER trg_wiize_pay_enqueue_all_on_connect
AFTER INSERT OR UPDATE OF status ON public.integration_connections
FOR EACH ROW EXECUTE FUNCTION public.wiize_pay_enqueue_all_on_connect();

-- Reserva de segurança para reenvios com falha: 1x por hora, só chama se houver pendência.
DO $$ BEGIN PERFORM cron.unschedule('wiize-pay-customer-retry'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('wiize-pay-customer-retry', '17 * * * *', $cron$
  SELECT public.wiize_pay_wake_customer_sync()
  WHERE EXISTS (SELECT 1 FROM public.wiize_pay_customer_sync_queue WHERE next_attempt_at <= now());
$cron$);