// @ts-nocheck
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { logAiUsage } from "../_shared/aiUsage.ts";

const GRAPH_VERSION = "v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { audio_url, message_id } = await req.json();
    if (!audio_url || typeof audio_url !== "string") {
      return new Response(JSON.stringify({ error: "audio_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve Meta media references to a real downloadable URL with bearer auth
    let fetchUrl = audio_url;
    let fetchHeaders: Record<string, string> = {};

    if (audio_url.startsWith("meta_media:")) {
      const mediaId = audio_url.slice("meta_media:".length).trim();
      if (!mediaId) {
        return new Response(JSON.stringify({ error: "Invalid meta_media id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Locate the access token via the message → conversation → connection
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

      // Fallback: pick any active connection access token if not provided
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

      // Step 1: resolve media id → temporary URL
      const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!metaRes.ok) {
        const t = await metaRes.text();
        return new Response(JSON.stringify({ error: `Meta media lookup failed (${metaRes.status})`, detail: t }), {
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
      fetchUrl = metaJson.url;
      fetchHeaders = { Authorization: `Bearer ${accessToken}` };
    }

    // Fetch the audio file
    const audioRes = await fetch(fetchUrl, { headers: fetchHeaders });
    if (!audioRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch audio (${audioRes.status})` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const audioBlob = await audioRes.blob();
    const mime = audioRes.headers.get("content-type") || audioBlob.type || "audio/ogg";
    const ext = mime.includes("mp4") ? "m4a"
              : mime.includes("webm") ? "webm"
              : mime.includes("mpeg") ? "mp3"
              : mime.includes("wav") ? "wav"
              : "ogg";

    const form = new FormData();
    form.append("file", audioBlob, `audio.${ext}`);
    form.append("model", "whisper-1");
    form.append("response_format", "json");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error("[transcribe-audio] whisper error", whisperRes.status, errText);
      return new Response(JSON.stringify({ error: "Whisper failed", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await whisperRes.json();
    // Whisper é cobrado por minuto (US$ 0.006/min). Estimamos pelo tamanho do áudio.
    const estimatedMinutes = Math.max(0.1, (audioBlob.size / (16 * 1024)) / 60);
    logAiUsage({ feature: 'transcribe-audio', model: 'whisper-1', cost_usd: estimatedMinutes * 0.006, metadata: { estimated_minutes: Number(estimatedMinutes.toFixed(2)), bytes: audioBlob.size } });
    return new Response(JSON.stringify({ text: data.text || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[transcribe-audio] fatal", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
