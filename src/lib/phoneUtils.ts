/**
 * Utility functions for phone number formatting and validation
 * Brazilian phone format: +55 (XX) XXXXX-XXXX (mobile) or +55 (XX) XXXX-XXXX (landline)
 */

/**
 * Format a phone number for display
 * Handles Brazilian numbers with country code (55)
 */
export const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  // Brazilian phone with country code
  if (digits.startsWith('55') && digits.length >= 12) {
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
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
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
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  
  // Group IDs start with 120363
  if (digits.startsWith('120363')) return false;
  
  // Valid length: 10-13 digits
  if (digits.length > 15) return false;
  if (digits.length < 10) return false;
  
  // Group JID patterns contain hyphen with timestamp
  if (phone.includes('-') && phone.length > 15) return false;
  
  return true;
};

/**
 * Normalize phone number to Brazilian format with country code
 */
export const normalizePhone = (phone: string): string => {
  let digits = phone.replace(/\D/g, '');
  
  // Add country code if missing
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
  display: string 
} => {
  const digits = String(phone).replace(/\D/g, '');
  const isValid = digits.length >= 10 && digits.length <= 13 && !digits.startsWith('120363');
  
  return { 
    isValid, 
    formatted: digits, 
    display: formatPhoneNumber(digits) 
  };
};
