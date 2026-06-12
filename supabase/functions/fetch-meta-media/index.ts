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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const message_id = url.searchParams.get("message_id");
    let accessToken: string | null = null;
    if (message_id) {
      const { data: msg } = await supabase
        .from("chat_messages")
        .select("conversation_id")
        .eq("id", message_id)
        .maybeSingle();
      if (msg?.conversation_id) {
        const { data: conv } = await supabase
          .from("chat_conversations")
          .select("waba_connection_id")
          .eq("id", msg.conversation_id)
          .maybeSingle();
        if (conv?.waba_connection_id) {
          const { data: conn } = await supabase
            .from("user_waba_connections")
            .select("access_token")
            .eq("id", conv.waba_connection_id)
            .maybeSingle();
          accessToken = conn?.access_token || null;
        }
      }
    }
    if (!accessToken) {
      const { data: anyConn } = await supabase
        .from("user_waba_connections")
        .select("access_token")
        .limit(1)
        .maybeSingle();
      accessToken = anyConn?.access_token || null;
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
