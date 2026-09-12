import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const MESSAGE_PREFIX = "enc:v1:";
const messageEncoder = new TextEncoder();
const messageDecoder = new TextDecoder();
let messageKeyPromise: Promise<CryptoKey> | null = null;
function messageBase64ToBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
function messageEncryptionKey(): Promise<CryptoKey> {
  if (messageKeyPromise) return messageKeyPromise;
  const secret = Deno.env.get("WIIZE_MESSAGE_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("Message encryption is unavailable");
  messageKeyPromise = crypto.subtle.digest("SHA-256", messageEncoder.encode(secret)).then((raw) =>
    crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"])
  );
  return messageKeyPromise;
}
async function decryptMessageValue(value: unknown): Promise<string | null> {
  if (typeof value !== "string") return null;
  if (!value.startsWith(MESSAGE_PREFIX)) return value;
  const parts = value.slice(MESSAGE_PREFIX.length).split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted message format");
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: messageBase64ToBuffer(parts[0]) },
      await messageEncryptionKey(), messageBase64ToBuffer(parts[1]),
    );
    return messageDecoder.decode(plaintext);
  } catch {
    throw new Error("Encrypted message could not be authenticated");
  }
}
async function decryptMessageMetadata(metadata: unknown): Promise<unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return metadata;
  const meta = metadata as Record<string, unknown>;
  if (typeof meta.transcription !== "string") return metadata;
  try {
    return { ...meta, transcription: await decryptMessageValue(meta.transcription) };
  } catch {
    return { ...meta, transcription: null, transcription_error: true };
  }
}
async function decryptMessageFields<T extends Record<string, unknown>>(row: T): Promise<T> {
  try {
    return {
      ...row,
      content: await decryptMessageValue(row.content),
      media_caption: await decryptMessageValue(row.media_caption),
      metadata: await decryptMessageMetadata(row.metadata),
    };
  } catch {
    console.error("[chat-secure-read] corrupted message", String(row.id || "unknown"));
    return { ...row, content: "[Mensagem indisponível]", media_caption: null, decryption_error: true };
  }
}
async function decryptConversationPreview<T extends Record<string, unknown>>(row: T): Promise<T> {
  try {
    return { ...row, last_message_text: await decryptMessageValue(row.last_message_text) };
  } catch {
    console.error("[chat-secure-read] corrupted conversation preview", String(row.id || "unknown"));
    return { ...row, last_message_text: "Mensagem indisponível", decryption_error: true };
  }
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: claims, error } = await admin.auth.getClaims(auth.slice(7));
    const callerId = claims?.claims?.sub as string | undefined;
    if (error || !callerId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const { data: ownerId } = await admin.rpc("get_account_owner", { _uid: callerId });
    const accountOwnerId = ownerId || callerId;

    if (action === "conversations") {
      const connectionId = String(body.connection_id || "");
      if (!connectionId) return json({ error: "connection_id is required" }, 400);
      const { data, error: queryError } = await admin.from("chat_conversations").select("*")
        .eq("owner_user_id", accountOwnerId).eq("waba_connection_id", connectionId)
        .eq("is_archived", false).order("is_pinned", { ascending: false })
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (queryError) return json({ error: "Unable to load conversations" }, 500);
      return json({ conversations: await Promise.all((data || []).map(decryptConversationPreview)) });
    }

    if (action === "conversation") {
      const conversationId = String(body.conversation_id || "");
      if (!conversationId) return json({ error: "conversation_id is required" }, 400);
      const { data, error: queryError } = await admin.from("chat_conversations").select("*")
        .eq("id", conversationId).eq("owner_user_id", accountOwnerId).maybeSingle();
      if (queryError || !data) return json({ error: "Not found" }, 404);
      return json({ conversation: await decryptConversationPreview(data) });
    }

    if (action === "messages" || action === "message") {
      const conversationId = String(body.conversation_id || "");
      const messageId = body.message_id ? String(body.message_id) : null;
      let convId = conversationId;
      if (messageId && !convId) {
        const { data: message } = await admin.from("chat_messages").select("conversation_id").eq("id", messageId).maybeSingle();
        convId = message?.conversation_id || "";
      }
      const { data: conversation } = await admin.from("chat_conversations").select("id")
        .eq("id", convId).eq("owner_user_id", accountOwnerId).maybeSingle();
      if (!conversation) return json({ error: "Not found" }, 404);
      let query = admin.from("chat_messages").select("*").eq("conversation_id", convId);
      if (messageId) query = query.eq("id", messageId);
      const limit = Math.min(Math.max(Number(body.limit) || 200, 1), 500);
      const before = typeof body.before === "string" ? body.before : null;
      if (before) query = query.lt("created_at", before);
      const { data, error: queryError } = await query.order("created_at", { ascending: false }).limit(limit);
      if (queryError) return json({ error: "Unable to load messages" }, 500);
      const messages = await Promise.all((data || []).map(decryptMessageFields));
      return json({ messages: messages.reverse(), has_more: messages.length === limit });
    }
    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("[chat-secure-read] request failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Unable to decrypt chat data" }, 500);
  }
});
