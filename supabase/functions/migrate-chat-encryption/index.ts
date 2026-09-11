import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const MESSAGE_PREFIX = "enc:v1:";
const messageEncoder = new TextEncoder();
let messageKeyPromise: Promise<CryptoKey> | null = null;
function messageBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function messageEncryptionKey(): Promise<CryptoKey> {
  if (messageKeyPromise) return messageKeyPromise;
  const secret = Deno.env.get("WIIZE_MESSAGE_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("Message encryption is unavailable");
  messageKeyPromise = crypto.subtle.digest("SHA-256", messageEncoder.encode(secret)).then((raw) =>
    crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt"])
  );
  return messageKeyPromise;
}
async function encryptMessageValue(value: unknown): Promise<string | null> {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.startsWith(MESSAGE_PREFIX)) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await messageEncryptionKey(), messageEncoder.encode(value));
  return `${MESSAGE_PREFIX}${messageBytesToBase64(iv)}:${messageBytesToBase64(new Uint8Array(ciphertext))}`;
}
async function encryptMessageFields<T extends Record<string, unknown>>(row: T): Promise<T> {
  return { ...row, content: await encryptMessageValue(row.content), media_caption: await encryptMessageValue(row.media_caption) };
}
async function encryptConversationPreview<T extends Record<string, unknown>>(row: T): Promise<T> {
  return "last_message_text" in row ? { ...row, last_message_text: await encryptMessageValue(row.last_message_text) } : row;
}


Deno.serve(async (req) => {
  const expected = Deno.env.get("WIIZE_API_CRON_SECRET");
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const suppliedCronSecret = req.headers.get("x-cron-secret");
  let authorized = Boolean(expected && suppliedCronSecret === expected);
  if (!authorized) {
    const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (bearer) {
      const { data: claims } = await db.auth.getClaims(bearer);
      const callerId = claims?.claims?.sub as string | undefined;
      if (callerId) {
        const { data: isAdmin } = await db.rpc("has_role", { _user_id: callerId, _role: "admin" });
        authorized = isAdmin === true;
      }
    }
  }
  if (!authorized) return new Response("Unauthorized", { status: 401 });
  let migratedMessages = 0;
  let migratedConversations = 0;
  const failures: Array<{ table: string; id: string }> = [];
  try {
    for (;;) {
      const { data, error: readError } = await db.from("chat_messages").select("id, content, media_caption")
        .or("content.not.like.enc:v1:%,media_caption.not.like.enc:v1:%").order("id").limit(100);
      if (readError) throw readError;
      const rows = (data || []).filter((row) =>
        (row.content && !String(row.content).startsWith(MESSAGE_PREFIX)) || (row.media_caption && !String(row.media_caption).startsWith(MESSAGE_PREFIX))
      );
      if (!rows.length) break;
      for (const row of rows) {
        const encrypted = await encryptMessageFields(row);
        const { error } = await db.from("chat_messages").update({ content: encrypted.content, media_caption: encrypted.media_caption }).eq("id", row.id);
        if (error) failures.push({ table: "chat_messages", id: String(row.id) });
        else migratedMessages++;
      }
      if (failures.length) break;
    }
    for (;;) {
      const { data, error: readError } = await db.from("chat_conversations").select("id, last_message_text")
        .not("last_message_text", "is", null).not("last_message_text", "like", "enc:v1:%").order("id").limit(100);
      if (readError) throw readError;
      if (!data?.length) break;
      for (const row of data) {
        const encrypted = await encryptConversationPreview(row);
        const { error } = await db.from("chat_conversations").update({ last_message_text: encrypted.last_message_text }).eq("id", row.id);
        if (error) failures.push({ table: "chat_conversations", id: String(row.id) });
        else migratedConversations++;
      }
      if (failures.length) break;
    }
    return Response.json({ ok: failures.length === 0, migrated_messages: migratedMessages, migrated_conversations: migratedConversations, failures }, { status: failures.length ? 500 : 200 });
  } catch (error) {
    console.error("[migrate-chat-encryption] migration failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Migration failed", migrated_messages: migratedMessages, migrated_conversations: migratedConversations }, { status: 500 });
  }
});
