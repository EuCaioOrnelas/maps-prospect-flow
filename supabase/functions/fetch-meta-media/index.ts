// @ts-nocheck
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GRAPH_VERSION = "v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get("ref") || "";
    if (!ref.startsWith("meta_media:")) {
      return new Response(JSON.stringify({ error: "ref must start with meta_media:" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const mediaId = ref.slice("meta_media:".length).trim();
    if (!mediaId) {
      return new Response(JSON.stringify({ error: "Invalid media id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- AUTH: only signed-in users, and only media from their own account ---
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } }
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve the account this caller belongs to (owner or sub-user)
    const { data: accountOwnerId } = await supabase.rpc("get_account_owner", { _uid: callerId });
    const allowedOwners = [callerId, accountOwnerId].filter(Boolean);

    const message_id = url.searchParams.get("message_id");
    if (!message_id) {
      return new Response(JSON.stringify({ error: "message_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: msg } = await supabase
      .from("chat_messages")
      .select("conversation_id, media_url")
      .eq("id", message_id)
      .maybeSingle();
    if (!msg?.conversation_id) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("waba_connection_id, user_id, owner_user_id")
      .eq("id", msg.conversation_id)
      .maybeSingle();

    const convOwners = [conv?.user_id, conv?.owner_user_id].filter(Boolean);
    const authorized = convOwners.some((o) => allowedOwners.includes(o));
    if (!conv || !authorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The requested media must be the one stored on that message
    if (msg.media_url && msg.media_url !== ref) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken: string | null = null;
    if (conv.waba_connection_id) {
      const { data: conn } = await supabase
        .from("user_waba_connections")
        .select("access_token")
        .eq("id", conv.waba_connection_id)
        .maybeSingle();
      accessToken = conn?.access_token || null;
    }

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "WhatsApp access token not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) {
      const t = await metaRes.text();
      // Meta media IDs expire after ~30 days. code 100 / subcode 33 = object missing.
      // Return 410 Gone so the <img>/<audio> tag fails silently instead of crashing the UI.
      let isExpired = false;
      try {
        const j = JSON.parse(t);
        const code = j?.error?.code;
        const subcode = j?.error?.error_subcode;
        if (code === 100 && (subcode === 33 || subcode === undefined)) isExpired = true;
      } catch (_) { /* ignore */ }

      if (isExpired) {
        console.warn(`[fetch-meta-media] media ${mediaId} expired/missing on Meta`);
        return new Response(JSON.stringify({ error: "media_expired", message: "Mídia não está mais disponível no WhatsApp (expirada após ~30 dias)." }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
        });
      }
      return new Response(JSON.stringify({ error: `Meta lookup failed (${metaRes.status})`, detail: t }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const metaJson = await metaRes.json();
    if (!metaJson?.url) {
      return new Response(JSON.stringify({ error: "Meta media url missing" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileRes = await fetch(metaJson.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) {
      const t = await fileRes.text();
      return new Response(JSON.stringify({ error: `Media fetch failed (${fileRes.status})`, detail: t }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = fileRes.headers.get("content-type") || metaJson.mime_type || "application/octet-stream";
    const buf = await fileRes.arrayBuffer();

    return new Response(buf, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(buf.byteLength),
      },
    });
  } catch (e) {
    console.error("[fetch-meta-media] fatal", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
