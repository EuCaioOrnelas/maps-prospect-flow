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
      categoria,
      cidade,
      google_maps_link,
      avaliacao_media,
      quantidade_avaliacoes,
      possui_site,
      site_url,
      possui_telefone,
      redes_sociais,
    } = body;

    const socialCount = Array.isArray(redes_sociais) ? redes_sociais.length : 0;

    // Fetch the company profile for personalized scoring
    const { data: companyProfile } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const companyContext = companyProfile ? `
DADOS DA SUA EMPRESA (quem está prospectando):
- Empresa: ${companyProfile.company_name}
- Nicho: ${companyProfile.company_niche}
- Produtos/Serviços que você vende: ${companyProfile.company_products}
- Público-alvo: ${companyProfile.company_target_audience}
- Diferencial: ${companyProfile.company_differential}
- Objetivo: ${companyProfile.company_objective}

IMPORTANTE: O diagnóstico, ação recomendada e sugestão de serviço devem ser baseados EXCLUSIVAMENTE nos produtos/serviços listados acima. NÃO sugira serviços que a empresa não oferece. Analise como os serviços "${companyProfile.company_products}" podem ajudar especificamente este lead.
` : "";

    // Let AI do the REAL scoring analysis
    const prompt = `Você é um consultor especialista em vendas B2B e qualificação de leads. Analise DETALHADAMENTE este lead comercial e retorne uma avaliação REALISTA e DIFERENCIADA. NÃO use scores genéricos — analise cada dado individualmente.

${companyContext}
DADOS DO LEAD:
- Nome da empresa: ${nome_empresa}
- Categoria/Nicho: ${categoria || "Não informado"}
- Cidade: ${cidade || "Não informado"}
- Endereço completo: ${endereco || "Não informado"}
- Link Google Maps: ${google_maps_link || "Não disponível"}
- Avaliação média: ${avaliacao_media !== null && avaliacao_media !== undefined ? `${avaliacao_media}/5` : "Sem avaliação"}
- Quantidade de avaliações: ${quantidade_avaliacoes || 0}
- Possui site próprio: ${possui_site ? `Sim (${site_url || "URL não capturada"})` : "Não"}
- Possui telefone para contato: ${possui_telefone ? "Sim" : "Não"}
- Redes sociais encontradas: ${socialCount > 0 ? `${socialCount} rede(s)` : "Nenhuma"}

MODELO DE PONTUAÇÃO (0-100):
Use estas 4 dimensões para calcular um score PRECISO:

1. ESTRUTURA DIGITAL (0-35 pontos):
   - Site profissional e completo: até 20pts (sem site = 0, mas é OPORTUNIDADE de venda)
   - Presença em redes sociais: até 15pts (0 redes=0, 1=5, 2=10, 3+=15)

2. REPUTAÇÃO ONLINE (0-30 pontos):
   - Nota de avaliação: até 15pts (sem nota=0, <3.0=3, 3.0-3.9=7, 4.0-4.4=11, 4.5+=15)
   - Volume de avaliações: até 15pts (0=0, 1-9=3, 10-29=6, 30-99=10, 100+=15)

3. ACESSIBILIDADE COMERCIAL (0-20 pontos):
   - Telefone disponível: 12pts (sim=12, não=0)
   - Endereço completo verificável: 8pts (sim=8, parcial=4, não=0)

4. POTENCIAL DE VENDA (0-15 pontos):
   - Empresas SEM site são OPORTUNIDADE para agências digitais: até 10pts
   - Avaliação baixa (<4.0) indica necessidade de gestão de reputação: até 5pts
   - Poucas avaliações indica empresa nova/crescendo: até 5pts
   - (máximo nesta categoria: 15pts)

IMPORTANTE:
- Calcule cada dimensão separadamente
- Empresas com MUITAS avaliações positivas + site = score ALTO (empresa bem estabelecida, fácil de abordar)
- Empresas SEM site + SEM redes = score MÉDIO-ALTO (grande oportunidade de venda de serviços digitais)
- Empresas com avaliações NEGATIVAS + sem presença = score BAIXO
- O score DEVE variar significativamente entre empresas diferentes
- NÃO dê scores genéricos como 60-70 para todos

Retorne APENAS um JSON válido com EXATAMENTE estas chaves:
{
  "score": <número inteiro 0-100>,
  "estrutura_digital": <número 0-35>,
  "reputacao": <número 0-30>,
  "acessibilidade": <número 0-20>,
  "potencial_venda": <número 0-15>,
  "nivel_oportunidade": "<Alta|Média|Baixa>",
  "probabilidade_fechamento": "<Muito Alta|Alta|Moderada|Baixa>",
  "diagnostico": "<diagnóstico estratégico em 2-3 frases específicas sobre ESTA empresa>",
  "acao_recomendada": "<ação concreta e específica em 1-2 frases>",
  "pontos_fortes": ["<ponto 1>", "<ponto 2>"],
  "pontos_fracos": ["<ponto 1>", "<ponto 2>"],
  "justificativa_score": "<1 frase explicando POR QUE este score específico>"
}`;

    let result: any = null;

    try {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 800,
          response_format: { type: "json_object" },
        }),
      });

      if (openaiRes.ok) {
        const aiData = await openaiRes.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          result = JSON.parse(content);
        }
      } else {
        const errText = await openaiRes.text();
        console.error("OpenAI error:", openaiRes.status, errText);
      }
    } catch (aiErr) {
      console.error("OpenAI error (non-fatal):", aiErr);
    }

    // Fallback if AI fails
    if (!result) {
      let score = 0;
      if (possui_site) score += 20;
      if (socialCount >= 3) score += 15; else if (socialCount >= 1) score += 8;
      if (avaliacao_media >= 4.5) score += 15; else if (avaliacao_media >= 4.0) score += 11; else if (avaliacao_media >= 3.0) score += 7;
      if (quantidade_avaliacoes > 100) score += 15; else if (quantidade_avaliacoes >= 30) score += 10; else if (quantidade_avaliacoes >= 10) score += 6;
      if (possui_telefone) score += 12;
      if (endereco && endereco !== "Não informado") score += 8;
      if (!possui_site) score += 10;
      if (avaliacao_media && avaliacao_media < 4.0) score += 5;
      score = Math.min(score, 100);

      result = {
        score,
        estrutura_digital: possui_site ? 20 + Math.min(socialCount * 5, 15) : Math.min(socialCount * 5, 15),
        reputacao: Math.min(30, (avaliacao_media >= 4.0 ? 15 : avaliacao_media >= 3.0 ? 7 : 0) + (quantidade_avaliacoes > 100 ? 15 : quantidade_avaliacoes >= 30 ? 10 : quantidade_avaliacoes >= 10 ? 6 : 0)),
        acessibilidade: (possui_telefone ? 12 : 0) + (endereco ? 8 : 0),
        potencial_venda: (!possui_site ? 10 : 0) + (avaliacao_media && avaliacao_media < 4.0 ? 5 : 0),
        nivel_oportunidade: score >= 61 ? "Alta" : score >= 31 ? "Média" : "Baixa",
        probabilidade_fechamento: score >= 81 ? "Muito Alta" : score >= 61 ? "Alta" : score >= 31 ? "Moderada" : "Baixa",
        diagnostico: `${nome_empresa} apresenta potencial comercial com score ${score}/100.`,
        acao_recomendada: !possui_site ? "Abordar oferecendo serviços de presença digital." : "Apresentar soluções de otimização e crescimento.",
        pontos_fortes: [],
        pontos_fracos: [],
        justificativa_score: "Score calculado por regras (IA indisponível).",
      };
    }

    const score = Math.max(0, Math.min(100, result.score));
    const nivel_oportunidade = result.nivel_oportunidade || (score >= 61 ? "Alta" : score >= 31 ? "Média" : "Baixa");
    const probabilidade_fechamento = result.probabilidade_fechamento || (score >= 81 ? "Muito Alta" : score >= 61 ? "Alta" : score >= 31 ? "Moderada" : "Baixa");

    if (lead_id) {
      const { error: updateErr } = await supabase
        .from("leads")
        .update({
          ai_score: score,
          opportunity_level: nivel_oportunidade,
          closing_probability: probabilidade_fechamento,
          ai_diagnosis: result.diagnostico || "",
          ai_recommended_action: result.acao_recomendada || "",
          enrichment_data: {
            scored_at: new Date().toISOString(),
            score_breakdown: {
              estrutura_digital: result.estrutura_digital,
              reputacao: result.reputacao,
              acessibilidade: result.acessibilidade,
              potencial_venda: result.potencial_venda,
            },
            pontos_fortes: result.pontos_fortes || [],
            pontos_fracos: result.pontos_fracos || [],
            justificativa_score: result.justificativa_score || "",
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
        diagnostico: result.diagnostico,
        acao_recomendada: result.acao_recomendada,
        score_breakdown: {
          estrutura_digital: result.estrutura_digital,
          reputacao: result.reputacao,
          acessibilidade: result.acessibilidade,
          potencial_venda: result.potencial_venda,
        },
        pontos_fortes: result.pontos_fortes || [],
        pontos_fracos: result.pontos_fracos || [],
        justificativa_score: result.justificativa_score || "",
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
