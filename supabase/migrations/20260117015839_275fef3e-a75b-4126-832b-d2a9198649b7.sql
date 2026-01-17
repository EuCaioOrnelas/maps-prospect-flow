-- Update the create_lead_from_conversation function to validate phone numbers
CREATE OR REPLACE FUNCTION public.create_lead_from_conversation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_lead_id uuid;
  first_stage_id uuid;
  clean_phone text;
BEGIN
  -- Validate phone number - skip invalid formats
  clean_phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  
  -- Skip if phone contains @lid (Facebook Lead ID)
  IF NEW.phone LIKE '%@lid%' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if phone contains @g.us (WhatsApp group)
  IF NEW.phone LIKE '%@g.us%' THEN
    RETURN NEW;
  END IF;
  
  -- Skip group IDs (start with 120363)
  IF clean_phone LIKE '120363%' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if phone is too long (>15 digits) or too short (<10 digits)
  IF LENGTH(clean_phone) > 15 OR LENGTH(clean_phone) < 10 THEN
    RETURN NEW;
  END IF;
  
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
$function$;