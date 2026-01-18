// Secure password hashing using Web Crypto API (available in Deno)
// This is a simple but secure approach using PBKDF2

const ITERATIONS = 100000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;

// Generate a cryptographically secure random salt
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// Convert Uint8Array to hex string
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to Uint8Array
function fromHex(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(0);
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

// Hash password using PBKDF2
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Import password as key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Create a new ArrayBuffer from the salt to ensure correct type
  const saltBuffer = new Uint8Array(salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength));
  
  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH
  );
  
  const hash = new Uint8Array(derivedBits);
  
  // Return salt:hash in hex format
  return `${toHex(salt)}:${toHex(hash)}`;
}

// Verify password against stored hash
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Handle legacy base64 hashes (btoa format) for backward compatibility
  if (!storedHash.includes(':')) {
    // Legacy format: simple base64
    try {
      const legacyHash = btoa(password);
      return storedHash === legacyHash;
    } catch {
      return false;
    }
  }
  
  // New format: salt:hash
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;
  
  const salt = fromHex(saltHex);
  const expectedHash = fromHex(hashHex);
  
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Import password as key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Create a new ArrayBuffer from the salt to ensure correct type
  const saltBuffer = new Uint8Array(salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength));
  
  // Derive key using same parameters
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH
  );
  
  const computedHash = new Uint8Array(derivedBits);
  
  // Constant-time comparison to prevent timing attacks
  if (computedHash.length !== expectedHash.length) return false;
  
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash[i] ^ expectedHash[i];
  }
  
  return result === 0;
}
