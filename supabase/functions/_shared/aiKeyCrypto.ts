// Criptografia AES-GCM das chaves de IA dos clientes (BYOK).
// A chave mestra vive apenas no ambiente das edge functions (AI_CREDENTIALS_SECRET).

async function masterKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("AI_CREDENTIALS_SECRET");
  if (!raw) throw new Error("AI_CREDENTIALS_SECRET não configurada");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toB64(buf: Uint8Array): string {
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function encryptApiKey(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await masterKey(),
      new TextEncoder().encode(plain),
    ),
  );
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv);
  out.set(cipher, iv.length);
  return toB64(out);
}

export async function decryptApiKey(stored: string): Promise<string> {
  const buf = fromB64(stored);
  const iv = buf.subarray(0, 12);
  const cipher = buf.subarray(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await masterKey(), cipher);
  return new TextDecoder().decode(plain);
}

export function keyHint(plain: string): string {
  const tail = plain.slice(-4);
  return `sk-••••${tail}`;
}
