// @ts-nocheck
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { audio_url } = await req.json();
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

    // Fetch the audio file
    const audioRes = await fetch(audio_url);
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
