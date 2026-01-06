-- Function to normalize Brazilian phone numbers (adds 9 if mobile number without it)
CREATE OR REPLACE FUNCTION normalize_brazilian_phone(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  clean_phone TEXT;
  ddd TEXT;
  number_part TEXT;
BEGIN
  -- Remove all non-digits
  clean_phone := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- If it's a LID or too short, return as-is
  IF clean_phone ~ '@lid' OR length(clean_phone) < 10 THEN
    RETURN phone_input;
  END IF;
  
  -- Remove country code 55 if present
  IF clean_phone LIKE '55%' AND length(clean_phone) >= 12 THEN
    clean_phone := substring(clean_phone from 3);
  END IF;
  
  -- Now we should have DDD + number (10 or 11 digits)
  -- Brazilian mobile numbers should be 11 digits (DDD + 9 + 8 digits)
  IF length(clean_phone) = 10 THEN
    ddd := substring(clean_phone from 1 for 2);
    number_part := substring(clean_phone from 3);
    
    -- Check if it's a mobile number (starts with 9, 8, 7, 6 after DDD)
    -- These are typically mobile numbers that need the 9 prefix
    IF substring(number_part from 1 for 1) IN ('6', '7', '8', '9') THEN
      -- Add the 9 prefix for mobile numbers
      clean_phone := ddd || '9' || number_part;
    END IF;
  END IF;
  
  -- Re-add country code
  RETURN '55' || clean_phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get normalized phone for comparison (last 8 digits)
CREATE OR REPLACE FUNCTION get_phone_key(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN RIGHT(regexp_replace(phone_input, '[^0-9]', '', 'g'), 8);
END;
$$ LANGUAGE plpgsql IMMUTABLE;