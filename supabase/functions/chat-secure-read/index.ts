import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { decryptConversationPreview, decryptMessageFields } from "../_shared/messageCrypto.ts";

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
      const { data, error: queryError } = await query.order("created_at", { ascending: true }).limit(limit);
      if (queryError) return json({ error: "Unable to load messages" }, 500);
      return json({ messages: await Promise.all((data || []).map(decryptMessageFields)) });
    }
    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("[chat-secure-read] request failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Unable to decrypt chat data" }, 500);
  }
});