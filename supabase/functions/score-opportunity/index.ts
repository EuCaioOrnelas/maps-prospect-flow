import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      lead_id,
      nome_empresa,
      endereco,
      google_maps_link,
      avaliacao_media,
      quantidade_avaliacoes,
      possui_site,
      possui_telefone,
      redes_sociais,
    } = body;

    // --- Deterministic scoring ---
    let score = 0;

    // 1. Estrutura Digital (até 35)
    if (possui_site) score += 20;
    const socialCount = Array.isArray(redes_sociais) ? redes_sociais.length : 0;
    if (socialCount >= 3) score += 15;
    else if (socialCount >= 1) score += 8;

    // 2. Reputação (até 30)
    if (avaliacao_media >= 4.5) score += 20;
    else if (avaliacao_media >= 4.0) score += 15;
    else if (avaliacao_media >= 3.0) score += 8;

    if (quantidade_avaliacoes > 100) score += 10;
    else if (quantidade_avaliacoes >= 30) score += 7;
    else if (quantidade_avaliacoes >= 10) score += 4;

    // 3. Acessibilidade Comercial (até 20)
    if (possui_telefone) score += 20;

    // 4. Oportunidade Oculta (até 15)
    if (!possui_site) score += 10;
    if (avaliacao_media < 4.0) score += 5;

    score = Math.min(score, 100);

    // Classifications
    let nivel_oportunidade: string;
    if (score >= 61) nivel_oportunidade = "Alta";
    else if (score >= 31) nivel_oportunidade = "Média";
    else nivel_oportunidade = "Baixa";

    let probabilidade_fechamento: string;
    if (score >= 81) probabilidade_fechamento = "Muito Alta";
    else if (score >= 61) probabilidade_fechamento = "Alta";
    else if (score >= 31) probabilidade_fechamento = "Moderada";
    else probabilidade_fechamento = "Baixa";

    // --- AI-powered diagnosis using OpenAI ---
    let diagnostico = "";
    let acao_recomendada = "";

    try {
      const prompt = `Você é um consultor de vendas B2B. Analise este lead e gere um diagnóstico estratégico curto (2-3 frases) e uma ação recomendada (1-2 frases).

DADOS DO LEAD:
- Empresa: ${nome_empresa}
- Endereço: ${endereco || "Não informado"}
- Avaliação: ${avaliacao_media}/5 (${quantidade_avaliacoes} avaliações)
- Possui site: ${possui_site ? "Sim" : "Não"}
- Possui telefone: ${possui_telefone ? "Sim" : "Não"}
- Redes sociais: ${socialCount > 0 ? `${socialCount} redes` : "Nenhuma"}
- Score calculado: ${score}/100
- Nível de oportunidade: ${nivel_oportunidade}

Retorne APENAS JSON válido com as chaves "diagnostico" e "acao_recomendada".`;

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 300,
          response_format: { type: "json_object" },
        }),
      });

      if (openaiRes.ok) {
        const aiData = await openaiRes.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          diagnostico = parsed.diagnostico || "";
          acao_recomendada = parsed.acao_recomendada || "";
        }
      }
    } catch (aiErr) {
      console.error("OpenAI error (non-fatal):", aiErr);
      // Fallback diagnostics
      diagnostico = score >= 61
        ? `${nome_empresa} apresenta forte oportunidade comercial com score ${score}/100.`
        : `${nome_empresa} possui potencial moderado. Score: ${score}/100.`;
      acao_recomendada = !possui_site
        ? "Abordar oferecendo serviços de presença digital."
        : "Apresentar soluções de otimização e crescimento.";
    }

    // Update lead in database
    if (lead_id) {
      const { error: updateErr } = await supabase
        .from("leads")
        .update({
          ai_score: score,
          opportunity_level: nivel_oportunidade,
          closing_probability: probabilidade_fechamento,
          ai_diagnosis: diagnostico,
          ai_recommended_action: acao_recomendada,
          enrichment_data: {
            scored_at: new Date().toISOString(),
            scoring_inputs: {
              avaliacao_media,
              quantidade_avaliacoes,
              possui_site,
              possui_telefone,
              redes_sociais_count: socialCount,
            },
          },
        })
        .eq("id", lead_id)
        .eq("user_id", user.id);

      if (updateErr) console.error("Update error:", updateErr);
    }

    return new Response(
      JSON.stringify({
        nome_empresa,
        score,
        nivel_oportunidade,
        probabilidade_fechamento,
        diagnostico,
        acao_recomendada,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Score error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
