import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioUrl } = await req.json();

    if (!audioUrl) {
      throw new Error("Audio URL is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch the audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error("Failed to fetch audio file");
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    // Use Gemini for audio transcription
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert audio transcription assistant. Your task is to transcribe audio content accurately.
            
Rules:
- Transcribe the audio exactly as spoken
- Include filler words like "um", "uh", "então" if they are in the audio
- Use proper punctuation
- If the audio is in Portuguese, transcribe in Portuguese
- If the audio is in English, transcribe in English  
- If no speech is detected, respond with "[Sem fala detectada]"
- Do NOT add any commentary, just the transcription
- Do NOT add quotation marks around the transcription`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please transcribe this audio message:"
              },
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format: "mp3"
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to transcribe audio");
    }

    const result = await response.json();
    const transcription = result.choices?.[0]?.message?.content || "[Transcrição não disponível]";

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
