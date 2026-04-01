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
    const socialLinks = Array.isArray(redes_sociais) ? redes_sociais : [];

    // Fetch company profile
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

    // Build social media context
    const socialContext = socialLinks.length > 0
      ? `\nREDES SOCIAIS ENCONTRADAS:\n${socialLinks.map((s: any) => {
          if (typeof s === 'string') return `- ${s}`;
          return `- ${s.platform || 'Rede social'}: ${s.url || s}`;
        }).join('\n')}\n\nANALISE AS REDES SOCIAIS: Verifique se os links indicam perfis ativos ou abandonados. Perfis sem posts recentes (>30 dias) indicam abandono digital. Perfis ativos indicam empresa engajada.`
      : "\nREDES SOCIAIS: Nenhuma encontrada — indica ausência de presença social.";

    // Build website context
    const websiteContext = possui_site && site_url
      ? `\nSITE: ${site_url}\nANALISE O SITE: Considere se ter um site indica maturidade digital. Um site mal feito ou desatualizado pode ser uma oportunidade. Sem SSL (http://) é um ponto fraco.`
      : "\nSITE: Não possui — indica lacuna na presença digital e oportunidade de venda.";

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
${websiteContext}
${socialContext}

MODELO DE PONTUAÇÃO (0-100) — As 5 dimensões DEVEM somar exatamente 100:

1. ESTRUTURA DIGITAL (0-25 pontos):
   - Site profissional: até 12pts (sem site=0, com site básico=6, site completo/profissional=12)
   - Presença em redes sociais: até 8pts (0 redes=0, 1=3, 2=6, 3+=8)
   - Qualidade das redes (perfis completos, ativos): até 5pts

2. REPUTAÇÃO ONLINE (0-25 pontos):
   - Nota de avaliação: até 12pts (sem nota=0, <3.0=2, 3.0-3.9=5, 4.0-4.4=9, 4.5+=12)
   - Volume de avaliações: até 8pts (0=0, 1-9=2, 10-29=4, 30-99=6, 100+=8)
   - Respostas do dono às avaliações: até 5pts (empresa que responde avaliações=5, não responde=0, sem avaliações=0)

3. ACESSIBILIDADE COMERCIAL (0-20 pontos):
   - Telefone disponível: 10pts (sim=10, não=0)
   - Endereço completo verificável: 6pts (sim=6, parcial=3, não=0)
   - Facilidade de contato geral: 4pts

4. ENGAJAMENTO E ATIVIDADE (0-15 pontos) — NOVO:
   - Redes sociais ativas (posts recentes): até 6pts (ativas=6, inativas/abandonadas=0)
   - Site atualizado/funcional: até 5pts (atualizado=5, desatualizado=2, sem site=0)
   - Responde avaliações recentes: até 4pts (responde=4, não responde=0)

5. POTENCIAL DE VENDA (0-15 pontos):
   - Empresas SEM site são OPORTUNIDADE: até 6pts
   - Redes sociais ausentes/abandonadas = oportunidade de gestão: até 4pts
   - Avaliação baixa (<4.0) indica necessidade de gestão de reputação: até 3pts
   - Poucas avaliações = empresa nova/crescendo: até 2pts

IMPORTANTE:
- A SOMA das 5 dimensões DEVE ser igual ao score total (máximo 100)
- Calcule cada dimensão separadamente
- Empresas com MUITAS avaliações positivas + site + redes ativas = score ALTO
- Empresas SEM site + SEM redes = score MÉDIO-ALTO (grande oportunidade de venda)
- Empresas com avaliações NEGATIVAS + sem presença = score BAIXO
- O score DEVE variar significativamente entre empresas diferentes
- NÃO dê scores genéricos como 60-70 para todos

COMO GERAR O DIAGNÓSTICO (campo "diagnostico"):
- Analise o cenário atual do lead considerando a REGIÃO (cidade), o NICHO (categoria) e a concorrência local
- Identifique as DORES reais: falta de visibilidade, reputação fraca, ausência digital, redes abandonadas, site desatualizado, etc.
- Seja específico sobre o mercado local
- Se tiver site, analise se parece profissional ou amador pela URL
- Se tiver redes sociais, comente sobre a presença online

COMO GERAR A AÇÃO RECOMENDADA (campo "acao_recomendada"):
- NÃO seja genérico como "ofereça criação de site" ou "venda seus serviços"
- ANALISE o cenário: região, nicho, concorrência local, pontos fracos
- IDENTIFIQUE a DOR PRINCIPAL
- SUGIRA UMA ESTRATÉGIA CONCRETA E DETALHADA usando os serviços da empresa prospectora
- EXPLIQUE COMO executar na prática
- Sugira um PONTO FUTURO DE MONETIZAÇÃO quando possível
- A ação deve ter 3-5 frases detalhadas

Retorne APENAS um JSON válido com EXATAMENTE estas chaves:
{
  "score": <número inteiro 0-100>,
  "estrutura_digital": <número 0-25>,
  "reputacao": <número 0-25>,
  "acessibilidade": <número 0-20>,
  "engajamento_atividade": <número 0-15>,
  "potencial_venda": <número 0-15>,
  "nivel_oportunidade": "<Alta|Média|Baixa>",
  "probabilidade_fechamento": "<Muito Alta|Alta|Moderada|Baixa>",
  "diagnostico": "<diagnóstico estratégico em 3-4 frases analisando cenário regional, presença digital, redes sociais, site e posição competitiva>",
  "acao_recomendada": "<estratégia detalhada em 3-5 frases: dor identificada + solução concreta com serviços da empresa + como executar + monetização futura>",
  "pontos_fortes": ["<ponto 1>", "<ponto 2>"],
  "pontos_fracos": ["<ponto 1>", "<ponto 2>"],
  "analise_site": "<análise breve do site se existir, ou 'Sem site' se não tiver>",
  "analise_redes_sociais": "<análise breve das redes sociais, atividade, engajamento>",
  "analise_reputacao_detalhada": "<análise das avaliações, se responde clientes, volume>",
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
          max_tokens: 1500,
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
      const estrutura = (possui_site ? 12 : 0) + Math.min(socialCount * 3, 8);
      const reputacao = (avaliacao_media >= 4.5 ? 12 : avaliacao_media >= 4.0 ? 9 : avaliacao_media >= 3.0 ? 5 : 0) +
        (quantidade_avaliacoes > 100 ? 8 : quantidade_avaliacoes >= 30 ? 6 : quantidade_avaliacoes >= 10 ? 4 : 0);
      const acessibilidade = (possui_telefone ? 10 : 0) + (endereco && endereco !== "Não informado" ? 6 : 0);
      const engajamento = (socialCount > 0 ? 3 : 0) + (possui_site ? 3 : 0);
      const potencial = (!possui_site ? 6 : 0) + (socialCount === 0 ? 4 : 0) + (avaliacao_media && avaliacao_media < 4.0 ? 3 : 0);
      score = Math.min(estrutura + reputacao + acessibilidade + engajamento + potencial, 100);

      result = {
        score,
        estrutura_digital: estrutura,
        reputacao,
        acessibilidade,
        engajamento_atividade: engajamento,
        potencial_venda: potencial,
        nivel_oportunidade: score >= 61 ? "Alta" : score >= 31 ? "Média" : "Baixa",
        probabilidade_fechamento: score >= 81 ? "Muito Alta" : score >= 61 ? "Alta" : score >= 31 ? "Moderada" : "Baixa",
        diagnostico: `${nome_empresa} apresenta potencial comercial com score ${score}/100.`,
        acao_recomendada: !possui_site ? "Abordar oferecendo serviços de presença digital." : "Apresentar soluções de otimização e crescimento.",
        pontos_fortes: [],
        pontos_fracos: [],
        analise_site: possui_site ? "Site encontrado" : "Sem site",
        analise_redes_sociais: socialCount > 0 ? `${socialCount} rede(s) encontrada(s)` : "Nenhuma rede social",
        analise_reputacao_detalhada: avaliacao_media ? `Avaliação ${avaliacao_media}/5 com ${quantidade_avaliacoes} avaliações` : "Sem avaliações",
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
              engajamento_atividade: result.engajamento_atividade,
              potencial_venda: result.potencial_venda,
            },
            pontos_fortes: result.pontos_fortes || [],
            pontos_fracos: result.pontos_fracos || [],
            analise_site: result.analise_site || "",
            analise_redes_sociais: result.analise_redes_sociais || "",
            analise_reputacao_detalhada: result.analise_reputacao_detalhada || "",
            justificativa_score: result.justificativa_score || "",
            scoring_inputs: {
              avaliacao_media,
              quantidade_avaliacoes,
              possui_site,
              site_url,
              possui_telefone,
              redes_sociais_count: socialCount,
              redes_sociais: socialLinks,
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
          engajamento_atividade: result.engajamento_atividade,
          potencial_venda: result.potencial_venda,
        },
        pontos_fortes: result.pontos_fortes || [],
        pontos_fracos: result.pontos_fracos || [],
        analise_site: result.analise_site || "",
        analise_redes_sociais: result.analise_redes_sociais || "",
        analise_reputacao_detalhada: result.analise_reputacao_detalhada || "",
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
