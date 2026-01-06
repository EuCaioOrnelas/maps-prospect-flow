-- Add whatsapp_number_id column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS whatsapp_number_id uuid REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_number_id ON public.leads(whatsapp_number_id);

-- Create a function to automatically create leads from conversations
CREATE OR REPLACE FUNCTION public.create_lead_from_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_lead_id uuid;
  first_stage_id uuid;
BEGIN
  -- Check if lead already exists for this phone
  SELECT id INTO existing_lead_id
  FROM public.leads
  WHERE phone = NEW.phone
  AND user_id = NEW.user_id
  LIMIT 1;
  
  -- If no lead exists, create one
  IF existing_lead_id IS NULL THEN
    -- Get the first pipeline stage (Prospectado)
    SELECT id INTO first_stage_id
    FROM public.pipeline_stages
    WHERE user_id = NEW.user_id
    ORDER BY position ASC
    LIMIT 1;
    
    INSERT INTO public.leads (
      user_id,
      phone,
      contact_name,
      whatsapp_number_id,
      conversation_id,
      pipeline_stage_id,
      whatsapp_status,
      origin
    ) VALUES (
      NEW.user_id,
      NEW.phone,
      NEW.contact_name,
      NEW.whatsapp_number_id,
      NEW.id,
      first_stage_id,
      'in_conversation',
      'whatsapp'
    );
  ELSE
    -- Update existing lead with conversation_id and whatsapp_number_id if not set
    UPDATE public.leads
    SET 
      conversation_id = COALESCE(conversation_id, NEW.id),
      whatsapp_number_id = COALESCE(whatsapp_number_id, NEW.whatsapp_number_id),
      contact_name = COALESCE(contact_name, NEW.contact_name),
      updated_at = now()
    WHERE id = existing_lead_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create leads from new conversations
DROP TRIGGER IF EXISTS trigger_create_lead_from_conversation ON public.conversations;
CREATE TRIGGER trigger_create_lead_from_conversation
AFTER INSERT ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.create_lead_from_conversation();