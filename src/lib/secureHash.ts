import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a secure hash for shared report passwords
 * Uses PBKDF2 via edge function for proper cryptographic hashing
 */
export async function hashReportPassword(password: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('hash-report-password', {
      body: { password }
    });

    if (error) {
      console.error('Error hashing password:', error);
      // Fallback to a simple client-side hash if the edge function fails
      return await clientSideHash(password);
    }

    return data.hash;
  } catch (err) {
    console.error('Error calling hash function:', err);
    // Fallback to client-side hash
    return await clientSideHash(password);
  }
}

/**
 * Client-side fallback hash using Web Crypto API
 * Only used if edge function is unavailable
 */
async function clientSideHash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  
  const hash = new Uint8Array(derivedBits);
  
  // Convert to hex
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${saltHex}:${hashHex}`;
}
