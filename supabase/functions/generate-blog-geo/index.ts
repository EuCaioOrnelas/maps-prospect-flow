import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // O admin do blog usa a mesma autenticação da aplicação.
    const authHeader = req.headers.get("Authorization");
    const token = (authHeader || "").replace("Bearer ", "").trim();
    if (!token) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) return json({ error: "backend_not_configured" }, 500);
    const blog = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData } = await blog.auth.getUser(token);
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const { data: roleRow } = await blog
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);


    const { title, subtitle, excerpt, content } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "missing_key" }, 500);

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

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
    logAiUsage({ feature: 'generate-blog-geo', model: 'gpt-4o-mini', usage: aiJson.usage });
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
