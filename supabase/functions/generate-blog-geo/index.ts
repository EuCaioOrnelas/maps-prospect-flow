import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const { data: userData } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const { data: roleRow } = await supa
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const { title, subtitle, excerpt, content } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "missing_key" }, 500);

    const plain = (content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);

    const systemPrompt = `Você é especialista em GEO (Generative Engine Optimization) — otimização de conteúdo para ser citado por IAs como ChatGPT, Perplexity e Google AI Overviews.

Sua tarefa: ler um artigo de blog B2B (SaaS de prospecção e CRM com IA chamado Wiize) e gerar:
1. Uma RESPOSTA CURTA direta (2-3 frases, ~40-80 palavras) que responda à pergunta central do artigo — é o que LLMs citam.
2. ENTIDADES reconhecíveis (5 a 10): conceitos, ferramentas, métricas, frameworks mencionados ou implícitos.
3. FAQ com 5 perguntas frequentes ricas e respostas completas (3-5 frases cada) que ampliem o artigo e cubram dúvidas reais do leitor B2B.

Idioma: Português do Brasil. Tom: profissional, direto, sem marketês.

RETORNE APENAS JSON VÁLIDO:
{
  "ai_short_answer": "string",
  "ai_entities": ["string"],
  "faq": [{"question":"string","answer":"string"}]
}`;

    const userPrompt = `TÍTULO: ${title || ""}
${subtitle ? `SUBTÍTULO: ${subtitle}\n` : ""}${excerpt ? `RESUMO: ${excerpt}\n` : ""}
CONTEÚDO:
${plain}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return json({ error: "rate_limit" }, 429);
      if (aiRes.status === 402) return json({ error: "no_credits" }, 402);
      console.error("AI error", aiRes.status, txt);
      return json({ error: "ai_failed" }, 500);
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { /* fallthrough */ }

    return json({
      ai_short_answer: parsed.ai_short_answer || "",
      ai_entities: Array.isArray(parsed.ai_entities) ? parsed.ai_entities : [],
      faq: Array.isArray(parsed.faq) ? parsed.faq : [],
    });
  } catch (e) {
    console.error("generate-blog-geo error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
