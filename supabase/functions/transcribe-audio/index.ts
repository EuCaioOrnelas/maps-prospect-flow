// @ts-nocheck
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
// ---- Registro de custo de IA (inline; sem módulo compartilhado) ----
const AI_PRICES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
  "gpt-4o": { in: 2.5 / 1_000_000, out: 10 / 1_000_000 },
  "gpt-4.1-mini": { in: 0.4 / 1_000_000, out: 1.6 / 1_000_000 },
  "text-embedding-3-small": { in: 0.02 / 1_000_000, out: 0 },
  "text-embedding-3-large": { in: 0.13 / 1_000_000, out: 0 },
};
async function logAiUsage(p: {
  feature: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const model = p.model.replace(/^openai\//, "").trim();
    const tin = p.tokens_in ?? p.usage?.prompt_tokens ?? 0;
    const tout = p.tokens_out ?? p.usage?.completion_tokens ?? 0;
    const price = AI_PRICES[model] ?? AI_PRICES["gpt-4o-mini"];
    const cost = p.cost_usd ?? tin * price.in + tout * price.out;
    await fetch(`${url}/rest/v1/ai_usage_logs`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        feature: p.feature,
        model,
        user_id: p.user_id ?? null,
        tokens_in: Math.round(tin),
        tokens_out: Math.round(tout),
        cost_usd: Number(cost.toFixed(8)),
        metadata: p.metadata ?? {},
      }),
    });
  } catch (e) {
    console.error("[aiUsage] log falhou", String(e));
  }
}
// ---- fim registro de custo de IA ----

const GRAPH_VERSION = "v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { audio_url, message_id, audio_base64, audio_mime, connection_id } = await req.json();
    if ((!audio_url || typeof audio_url !== "string") && !audio_base64) {
      return new Response(JSON.stringify({ error: "audio_url or audio_base64 required" }), {
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

    // Áudio enviado direto (base64) — usado pelo chat de teste do SDR e pela Wian
    let inlineBlob: Blob | null = null;
    if (audio_base64) {
      const bin = Uint8Array.from(atob(String(audio_base64)), (c) => c.charCodeAt(0));
      inlineBlob = new Blob([bin], { type: String(audio_mime || "audio/webm") });
    }

    // Resolve Meta media references to a real downloadable URL with bearer auth
    let fetchUrl = audio_url;
    let fetchHeaders: Record<string, string> = {};

    if (!inlineBlob && audio_url.startsWith("meta_media:")) {

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
