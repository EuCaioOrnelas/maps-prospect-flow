const PREFIX = "enc:v1:";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let keyPromise: Promise<CryptoKey> | null = null;

function key() {
  if (keyPromise) return keyPromise;
  const secret = Deno.env.get("WIIZE_MESSAGE_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("Message encryption is unavailable");
  keyPromise = crypto.subtle.digest("SHA-256", encoder.encode(secret)).then((raw) =>
    crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  );
  return keyPromise;
}

function decode(value: string): ArrayBuffer {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)).buffer;
}

function encode(value: Uint8Array) {
  let result = "";
  for (let i = 0; i < value.length; i += 0x8000) result += String.fromCharCode(...value.subarray(i, i + 0x8000));
  return btoa(result);
}

async function encrypt(value: unknown): Promise<string | null> {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith(PREFIX)) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), encoder.encode(value));
  return `${PREFIX}${encode(iv)}:${encode(new Uint8Array(encrypted))}`;
}

async function decrypt(value: unknown): Promise<string | null> {
  if (typeof value !== "string") return null;
  if (!value.startsWith(PREFIX)) return value;
  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted message format");
  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(parts[0]) }, await key(), decode(parts[1]));
    return decoder.decode(plaintext);
  } catch {
    throw new Error("Encrypted message could not be authenticated");
  }
}

export async function encryptMessageFields<T extends Record<string, unknown>>(row: T) {
  return { ...row, content: await encrypt(row.content), media_caption: await encrypt(row.media_caption) };
}

export async function decryptMessageFields<T extends Record<string, unknown>>(row: T) {
  return { ...row, content: await decrypt(row.content), media_caption: await decrypt(row.media_caption) };
}

export async function encryptConversationPreview<T extends Record<string, unknown>>(row: T) {
  return "last_message_text" in row ? { ...row, last_message_text: await encrypt(row.last_message_text) } : row;
}