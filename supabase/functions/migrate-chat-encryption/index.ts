import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encryptConversationPreview, encryptMessageFields, isEncryptedMessage } from "../_shared/messageCrypto.ts";

Deno.serve(async (req) => {
  const expected = Deno.env.get("WIIZE_API_CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) return new Response("Unauthorized", { status: 401 });
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  let migratedMessages = 0;
  let migratedConversations = 0;
  try {
    for (;;) {
      const { data } = await db.from("chat_messages").select("id, content, media_caption")
        .or("content.not.like.enc:v1:%,media_caption.not.like.enc:v1:%").limit(100);
      const rows = (data || []).filter((row) =>
        (row.content && !isEncryptedMessage(row.content)) || (row.media_caption && !isEncryptedMessage(row.media_caption))
      );
      if (!rows.length) break;
      for (const row of rows) {
        const encrypted = await encryptMessageFields(row);
        const { error } = await db.from("chat_messages").update({ content: encrypted.content, media_caption: encrypted.media_caption }).eq("id", row.id);
        if (error) throw error;
        migratedMessages++;
      }
    }
    for (;;) {
      const { data } = await db.from("chat_conversations").select("id, last_message_text")
        .not("last_message_text", "is", null).not("last_message_text", "like", "enc:v1:%").limit(100);
      if (!data?.length) break;
      for (const row of data) {
        const encrypted = await encryptConversationPreview(row);
        const { error } = await db.from("chat_conversations").update({ last_message_text: encrypted.last_message_text }).eq("id", row.id);
        if (error) throw error;
        migratedConversations++;
      }
    }
    return Response.json({ ok: true, migrated_messages: migratedMessages, migrated_conversations: migratedConversations });
  } catch (error) {
    console.error("[migrate-chat-encryption] migration failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Migration failed", migrated_messages: migratedMessages, migrated_conversations: migratedConversations }, { status: 500 });
  }
});