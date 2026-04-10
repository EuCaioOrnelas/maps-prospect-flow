/**
 * Utility functions for phone number formatting and validation
 * Supports Brazilian and international phone formats
 */

/**
 * Format a phone number for display
 * Handles Brazilian and international numbers
 */
export const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  // Brazilian phone with country code
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    
    // 9-digit mobile numbers: +55 (XX) XXXXX-XXXX
    if (number.length === 9) {
      return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    }
    // 8-digit landline/old mobile: +55 (XX) XXXX-XXXX
    if (number.length === 8) {
      return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }
  }
  
  // Brazilian number without country code (10-11 digits)
  if (digits.length === 11 && !digits.startsWith('1')) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10 && !digits.startsWith('1')) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  // International format: +XX XXXX XXXX...
  if (digits.length >= 10) {
    return `+${digits}`;
  }
  
  // Fallback: just show with + prefix
  return `+${digits}`;
};

/**
 * Format phone for display without country code prefix (shorter format)
 * Used in compact UI elements like cards
 */
export const formatPhoneShort = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  // Brazilian phone with country code
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    
    // 9-digit mobile numbers: (XX) XXXXX-XXXX
    if (number.length === 9) {
      return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    }
    // 8-digit landline/old mobile: (XX) XXXX-XXXX
    if (number.length === 8) {
      return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }
  }
  
  // Brazilian number without country code (10-11 digits)
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  // Fallback
  return `+${digits}`;
};

/**
 * Check if a phone number is valid (not a group ID)
 * Supports international numbers
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  
  // Group IDs start with 120363
  if (digits.startsWith('120363')) return false;
  
  // Valid length: 10-15 digits (supports international)
  if (digits.length > 15) return false;
  if (digits.length < 10) return false;
  
  // Group JID patterns contain hyphen with timestamp
  if (phone.includes('-') && phone.length > 15) return false;
  
  return true;
};

/**
 * Check if a Brazilian phone number is a landline (fixed line)
 * Landlines don't work with WhatsApp
 * 
 * Brazilian landlines have 10 digits (with country code = 12 digits)
 * Mobile numbers have 11 digits (with country code = 13 digits)
 * Mobile numbers start with 9 after the DDD
 */
export const isLandlinePhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  
  // Only apply landline detection for Brazilian numbers
  const isBrazilian =
    (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) ||
    (!digits.startsWith('55') && digits.length >= 10 && digits.length <= 11);

  if (!isBrazilian) return false; // International numbers: never flag as landline

  // Remove country code if present
  let localNumber = digits;
  if (digits.startsWith('55') && digits.length >= 12) {
    localNumber = digits.slice(2);
  }
  
  // Brazilian landline: 10 digits (DDD + 8 digit number)
  if (localNumber.length === 10) {
    const afterDDD = localNumber.slice(2);
    if (!afterDDD.startsWith('9')) {
      return true;
    }
  }
  
  // Mobile: 11 digits, number after DDD starts with 9
  if (localNumber.length === 11) {
    const afterDDD = localNumber.slice(2);
    if (!afterDDD.startsWith('9')) {
      return true;
    }
  }
  
  return false;
};

/**
 * Check if phone is a mobile number (works with WhatsApp)
 */
export const isMobilePhone = (phone: string): boolean => {
  if (!isValidPhoneNumber(phone)) return false;
  return !isLandlinePhone(phone);
};

/**
 * Detecta números provavelmente artificiais/de-teste (ex.: 9999-0001)
 * para evitar poluir funis e dashboards.
 */
export const isLikelyPlaceholderPhone = (phone: string): boolean => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return true;

  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(4) : digits;
  const subscriber = local.length >= 8 ? local.slice(-8) : local;

  // Padrões clássicos de teste/placeholder
  if (/^(\d)\1{7}$/.test(subscriber)) return true;           // 00000000, 99999999
  if (subscriber.startsWith('9999')) return true;              // 9999-xxxx
  if (/(0000|1234|4321)/.test(subscriber)) return true;        // blocos artificiais
  if (subscriber.endsWith('0000') || subscriber.endsWith('0001') || subscriber.endsWith('0002')) return true;

  return false;
};

/**
 * Normalize phone number - supports international numbers
 * For Brazilian numbers (10-11 digits without country code), adds 55
 * For international numbers (already has country code), keeps as-is
 */
export const normalizePhone = (phone: string): string => {
  let digits = phone.replace(/\D/g, '');
  
  // If number has 10-11 digits without country code, assume Brazil (55)
  // International numbers should already have country code (12+ digits)
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith('55')) {
    digits = '55' + digits;
  }
  
  return digits;
};

/**
 * Validate and format phone with display string
 */
export const validateAndFormatPhone = (phone: string): { 
  isValid: boolean; 
  formatted: string; 
  display: string;
  isLandline: boolean;
  missingCountryCode: boolean;
} => {
  const digits = String(phone).replace(/\D/g, '');
  const isLandline = isLandlinePhone(digits);
  
  // Check if number has country code (12+ digits for Brazil, or starts with non-55 country code)
  const hasCountryCode = digits.length >= 12 || (digits.length >= 10 && !digits.startsWith('55') && digits.length <= 11 ? false : digits.length >= 12);
  const missingCountryCode = digits.length >= 10 && digits.length <= 11 && !digits.startsWith('55');
  
  const isValid = digits.length >= 10 && digits.length <= 15 && !digits.startsWith('120363');
  
  return { 
    isValid, 
    formatted: digits, 
    display: formatPhoneNumber(digits),
    isLandline,
    missingCountryCode,
  };
};

/**
 * Count landline phones in a list of leads
 */
export const countLandlinePhones = (leads: Array<{ phone?: string }>): number => {
  return leads.filter(lead => lead.phone && isLandlinePhone(lead.phone)).length;
};
