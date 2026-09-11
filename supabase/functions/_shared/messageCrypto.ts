const PREFIX = "enc:v1:";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

const keyPromises = new Map<string, Promise<CryptoKey>>();

function encryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("WIIZE_MESSAGE_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("Message encryption is unavailable");
  const existing = keyPromises.get(secret);
  if (existing) return existing;
  const keyPromise = crypto.subtle.digest("SHA-256", encoder.encode(secret)).then((raw) =>
    crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  );
  keyPromises.set(secret, keyPromise);
  return keyPromise;
}

export function isEncryptedMessage(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export async function encryptMessage(value: string): Promise<string> {
  if (isEncryptedMessage(value)) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    encoder.encode(value),
  );
  return `${PREFIX}${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function encryptNullable(value: unknown): Promise<string | null> {
  return typeof value === "string" && value.length > 0 ? encryptMessage(value) : null;
}

export async function decryptMessage(value: string): Promise<string> {
  if (!isEncryptedMessage(value)) return value; // legacy rows during controlled migration
  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted message format");
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(parts[0]) },
      await encryptionKey(),
      base64ToBytes(parts[1]),
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error("Encrypted message could not be authenticated");
  }
}

export async function decryptNullable(value: unknown): Promise<string | null> {
  return typeof value === "string" ? decryptMessage(value) : null;
}

export async function encryptMessageFields<T extends Record<string, unknown>>(row: T): Promise<T> {
  return {
    ...row,
    content: await encryptNullable(row.content),
    media_caption: await encryptNullable(row.media_caption),
  };
}

export async function decryptMessageFields<T extends Record<string, unknown>>(row: T): Promise<T> {
  return {
    ...row,
    content: await decryptNullable(row.content),
    media_caption: await decryptNullable(row.media_caption),
  };
}

export async function encryptConversationPreview<T extends Record<string, unknown>>(row: T): Promise<T> {
  if (!("last_message_text" in row)) return row;
  return { ...row, last_message_text: await encryptNullable(row.last_message_text) };
}

export async function decryptConversationPreview<T extends Record<string, unknown>>(row: T): Promise<T> {
  return { ...row, last_message_text: await decryptNullable(row.last_message_text) };
}