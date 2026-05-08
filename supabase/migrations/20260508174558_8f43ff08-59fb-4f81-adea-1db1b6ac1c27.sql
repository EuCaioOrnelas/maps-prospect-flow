
-- Sequência para gerar número de chamado
CREATE SEQUENCE IF NOT EXISTS public.support_tickets_number_seq START 1000;

-- Coluna ticket_number (texto formatado WIZ-000XXX)
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE;

-- Função para gerar o número
CREATE OR REPLACE FUNCTION public.generate_support_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'WIZ-' || LPAD(nextval('public.support_tickets_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger BEFORE INSERT
DROP TRIGGER IF EXISTS set_support_ticket_number ON public.support_tickets;
CREATE TRIGGER set_support_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_support_ticket_number();

-- Backfill em chamados antigos
UPDATE public.support_tickets
SET ticket_number = 'WIZ-' || LPAD(nextval('public.support_tickets_number_seq')::text, 6, '0')
WHERE ticket_number IS NULL;
