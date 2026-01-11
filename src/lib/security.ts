/**
 * Security utilities for WiizeProspect
 * 
 * These functions help protect sensitive data in the frontend
 * by masking phone numbers, emails, and other PII.
 */

/**
 * Masks a phone number, showing only the last 4 digits
 * Example: +55 11 99999-1234 -> +55 11 *****-1234
 */
export function maskPhoneNumber(phone: string | null | undefined, showFull = false): string {
  if (!phone) return '';
  if (showFull) return formatPhoneDisplay(phone);
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 4) return phone;
  
  const lastFour = digits.slice(-4);
  const masked = '*'.repeat(Math.max(0, digits.length - 4));
  
  // Format as Brazilian phone
  if (digits.length >= 12) {
    // With country code: +55 11 *****-1234
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${masked.slice(0, -4).replace(/(.{5})/, '$1-')}${lastFour}`;
  } else if (digits.length >= 10) {
    // Without country code: (11) *****-1234
    return `(${digits.slice(0, 2)}) ${masked.slice(0, -4)}*-${lastFour}`;
  }
  
  return `${masked}${lastFour}`;
}

/**
 * Format phone for display (full, unmasked)
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 13) {
    // 55 + DDD + 9 + number (8 digits)
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 5)} ${digits.slice(5, 9)}-${digits.slice(9)}`;
  } else if (digits.length === 12) {
    // 55 + DDD + number (8 digits)
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  } else if (digits.length === 11) {
    // DDD + 9 + number
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    // DDD + number
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  return phone;
}

/**
 * Masks an email address
 * Example: john.doe@example.com -> j***e@e***.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  const maskedLocal = local.length > 2 
    ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
    : local;
  
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.map((part, index) => {
    if (index === domainParts.length - 1) return part; // Keep TLD
    return part.length > 2 
      ? `${part[0]}${'*'.repeat(part.length - 2)}${part[part.length - 1]}`
      : part;
  }).join('.');
  
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates that a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Removes sensitive data from objects before logging
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const sensitiveKeys = [
    'password', 'token', 'apiKey', 'api_key', 'secret', 
    'authorization', 'phone', 'email', 'cpf', 'cnpj',
    'card_number', 'cvv', 'fingerprint'
  ];
  
  const sanitized: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key as keyof T] = '[REDACTED]' as unknown as T[keyof T];
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key as keyof T] = sanitizeForLogging(value as Record<string, unknown>) as unknown as T[keyof T];
    } else {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }
  
  return sanitized;
}

/**
 * Security message for users
 */
export const SECURITY_MESSAGE = "Seus dados e conversas são protegidos com isolamento individual e criptografia.";

/**
 * Validates that the current user owns a resource
 * This should ALWAYS be used in addition to RLS, never as a replacement
 */
export function validateOwnership(resourceUserId: string | null | undefined, currentUserId: string | null | undefined): boolean {
  if (!resourceUserId || !currentUserId) return false;
  return resourceUserId === currentUserId;
}
