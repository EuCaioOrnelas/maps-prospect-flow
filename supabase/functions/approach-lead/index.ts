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
    const { lead_id } = body;

    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("user_id", user.id)
      .single();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the company profile for personalization
    const { data: companyProfile } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const socialMedia = Array.isArray(lead.social_media) ? lead.social_media : [];
    const hasSite = !!lead.website && lead.website !== "-";

    // Extract diagnostic data if available
    const enrichment = lead.enrichment_data && typeof lead.enrichment_data === "object" ? lead.enrichment_data as Record<string, any> : {};
    const hasDiagnostic = !!lead.ai_diagnosis || !!lead.ai_score;
    const pontosFortes = Array.isArray(enrichment.pontos_fortes) ? enrichment.pontos_fortes : [];
    const pontosFracos = Array.isArray(enrichment.pontos_fracos) ? enrichment.pontos_fracos : [];
    const analiseSite = enrichment.analise_site || "";
    const analiseRedes = enrichment.analise_redes_sociais || "";
    const analiseConcorrencia = enrichment.analise_concorrencia_regional || "";
    const analiseDemanda = enrichment.analise_demanda_regional || "";
    const nicheAnalysisType = enrichment.niche_analysis_type || "";

    // Build company context
    const companyContext = companyProfile ? `
⚠️ INSTRUÇÃO PRIMÁRIA — PERFIL DA EMPRESA PROSPECTORA:
- Empresa: ${companyProfile.company_name}
- Atendente: ${companyProfile.attendant_name}
- Nicho de atuação: ${companyProfile.company_niche}
- Produtos/Serviços que VENDE: ${companyProfile.company_products}
- Diferencial competitivo: ${companyProfile.company_differential}
- Objetivo comercial: ${companyProfile.company_objective}
- Público-alvo: ${companyProfile.company_target_audience}

REGRA ABSOLUTA: A mensagem DEVE girar em torno de "${companyProfile.company_products}". NÃO fale de serviços que a empresa NÃO oferece. Se a empresa vende internet, fale APENAS de internet. Se vende energia solar, fale APENAS de energia solar. Se vende marketing, fale de marketing. NUNCA desvie do que está descrito acima.
` : "";

    // Build diagnostic context if available
    const diagnosticContext = hasDiagnostic ? `
═══ DIAGNÓSTICO JÁ REALIZADO DESTE LEAD (use como base) ═══
- Score: ${lead.ai_score || "N/A"}/100
- Nível: ${lead.opportunity_level || "N/A"}
- Probabilidade de fechamento: ${lead.closing_probability || "N/A"}
- Diagnóstico: ${lead.ai_diagnosis || "N/A"}
- Ação recomendada: ${lead.ai_recommended_action || "N/A"}
${pontosFortes.length > 0 ? `- Pontos fortes identificados: ${pontosFortes.join("; ")}` : ""}
${pontosFracos.length > 0 ? `- Pontos fracos identificados: ${pontosFracos.join("; ")}` : "- Pontos fracos: não identificados (nicho muito específico — foque na região e tipo de negócio)"}
${analiseConcorrencia ? `- Concorrência regional: ${analiseConcorrencia}` : ""}
${analiseDemanda ? `- Demanda regional: ${analiseDemanda}` : ""}
${nicheAnalysisType ? `- Tipo de análise aplicada: ${nicheAnalysisType}` : ""}
${enrichment.custom_diagnosis ? `\n═══ OBSERVAÇÕES DO PROSPECTOR (diagnóstico adicional do usuário) ═══\n${enrichment.custom_diagnosis}` : ""}

IMPORTANTE: Use os PONTOS FRACOS do diagnóstico como GANCHO da mensagem. Se não há pontos fracos (nicho específico), use a REGIÃO e o TIPO DE NEGÓCIO como gancho. Se há observações do prospector, PRIORIZE essas informações pois são análises reais feitas pelo usuário.
` : "";

    // Generate a random seed to force unique messages even for similar diagnostics
    const uniqueSeed = crypto.randomUUID().slice(0, 8);

    // Determine niche category for approach strategy
    const nicheText = companyProfile ? `${companyProfile.company_niche || ""} ${companyProfile.company_products || ""}`.toLowerCase() : "";
    const isDigitalNiche = /(marketing|site|seo|rede social|tr[aá]fego|ads|design|conte[uú]do|social media)/.test(nicheText);
    const isInfrastructureNiche = /(internet|provedor|fibra|telecom|solar|energia|seguran[cç]a|monitoramento|c[aâ]mera|alarme)/.test(nicheText);
    const isProductNiche = /(uniforme|embalagem|m[aá]quina|equipamento|auto pe[cç]a|ra[cç][aã]o|insumo|fertilizante|ferramenta)/.test(nicheText);
    const isServiceNiche = /(limpeza|facilities|bpo|terceiriza|contabilidade|advoc|consultoria|mentoria)/.test(nicheText);

    const nicheStrategy = isDigitalNiche
      ? "DIGITAL: Use dados do site, redes sociais e avaliações como gancho. Fale sobre presença digital, engajamento, conversão."
      : isInfrastructureNiche
      ? "INFRAESTRUTURA: NÃO fale de redes sociais ou site. Foque na REGIÃO, TIPO DE NEGÓCIO e NECESSIDADE OPERACIONAL. Ex: 'negócios como o seu na região de [cidade] costumam ter demanda por [serviço]'."
      : isProductNiche
      ? "PRODUTO: Foque na OPERAÇÃO do lead e como o produto resolve uma necessidade prática do dia-a-dia. Mencione o tipo de negócio e a região."
      : isServiceNiche
      ? "SERVIÇO: Foque no PORTE e COMPLEXIDADE do negócio do lead. Mostre como o serviço terceirizado otimiza a operação."
      : "GENÉRICO: Use região, tipo de negócio e qualquer dado disponível. Se não há dados suficientes para personalizar, crie um gancho sobre a região e proponha uma conversa.";

    const prompt = `Você é um especialista em vendas B2B e prospecção comercial. Crie uma MENSAGEM DE FOLLOW-UP personalizada para WhatsApp.

CONTEXTO CRÍTICO — LEIA COM ATENÇÃO:
Esta mensagem NÃO é o primeiro contato. O primeiro contato já foi feito por um TEMPLATE oficial da Meta (mensagem curta, padronizada, perguntando se o lead tem interesse em saber mais sobre o que oferecemos).
O lead JÁ RESPONDEU positivamente a esse template (ex: "sim", "pode", "quero saber", "manda detalhes", etc.) — ou seja, ele AUTORIZOU a conversa e a janela de 24h está aberta.
Sua tarefa é gerar a SEGUNDA mensagem: a primeira resposta humana, consultiva e personalizada que vai dar continuidade à conversa AGORA que o lead demonstrou interesse.

Por isso:
- ❌ NÃO se apresente como se fosse um primeiro contato frio
- ❌ NÃO pergunte se ele tem interesse (ele já disse que tem)
- ❌ NÃO use frases como "tudo bem te chamar?", "posso te apresentar?", "pode te explicar?"
- ✅ AGRADEÇA o retorno (de forma natural, em 1 linha) e já entregue VALOR
- ✅ Fale como quem já foi autorizado: direto, consultivo, mostrando que entendeu o negócio dele
- ✅ Conduza para o PRÓXIMO PASSO real (uma pergunta qualificadora, agendar uma call rápida, mandar material, etc.)

${companyContext}
${diagnosticContext}

DADOS DO LEAD:
- Empresa: ${lead.company_name || "Não informado"}
- Categoria/Nicho do lead: ${lead.category || "Não informado"}
- Cidade: ${lead.city || "Não informado"}
- Endereço: ${lead.address || "Não informado"}
- Avaliação Google: ${lead.rating || 0}/5 (${lead.review_count || 0} avaliações)
- Possui site: ${hasSite ? "Sim" : "Não"}
- Redes sociais: ${socialMedia.length > 0 ? socialMedia.join(", ") : "Nenhuma"}

═══ ESTRATÉGIA DE ABORDAGEM POR NICHO ═══
${nicheStrategy}

═══ VARIAÇÃO NATURAL (SEED: ${uniqueSeed}) ═══
A mensagem deve parecer escrita à mão por um vendedor humano, de forma única para ESTE lead específico.
- Use o NOME DA EMPRESA, a CIDADE, o NICHO e os dados do diagnóstico como diferenciadores naturais
- Varie levemente o tom, a forma de agradecer e o próximo passo proposto
- Mantenha humano, consultivo, nada robótico ou genérico

═══ ESTRUTURA OBRIGATÓRIA (4 parágrafos curtos, separados por \\n\\n) ═══
1. Agradecimento curto pelo retorno + reconhecimento de que viu o negócio dele (ex: "Show que respondeu! Dei uma olhada na [empresa] aqui em [cidade]...")
2. Apresentação rápida (nome + empresa + o que faz em 1 linha, sem rodeios)
3. Insight/valor real conectado à dor ou oportunidade detectada no diagnóstico — algo que mostre que ele NÃO está falando com um robô genérico
4. Próximo passo claro e leve: uma pergunta qualificadora OU convite para uma call rápida de 10-15 min OU oferta de enviar um material/proposta

═══ REGRAS CRÍTICAS ═══
- ⛔ PROIBIDO cumprimentos temporais: "Bom dia", "Boa tarde", "Boa noite"
- ⛔ PROIBIDO "Tudo bem?", "Como vai?", "Como está?" — o lead já respondeu, vá direto
- ⛔ PROIBIDO pedir permissão de novo ("posso te apresentar?", "tudo bem se eu te explicar?")
- ⛔ PROIBIDO tratar como mensagem fria — esta é a CONTINUAÇÃO de uma conversa
- ${companyProfile ? `Represente "${companyProfile.attendant_name}" da "${companyProfile.company_name}"` : "Mensagem genérica"}
- ${companyProfile ? `SOMENTE fale sobre "${companyProfile.company_products}" — NUNCA mencione serviços que a empresa NÃO vende` : ""}
- ${companyProfile ? `Use "${companyProfile.company_differential}" como argumento natural` : ""}
- Máx 4 parágrafos CURTOS separados por \\n\\n
- NÃO mencione dados irrelevantes ao nicho (ex: não fale de avaliações se vende internet)
- ${pontosFracos.length === 0 && hasDiagnostic ? "O diagnóstico não identificou pontos fracos específicos — use região e tipo de negócio como gancho" : ""}
- ${companyProfile ? `Assine como "${companyProfile.attendant_name}" da "${companyProfile.company_name}"` : ""}

Retorne APENAS JSON válido:
{
  "mensagem": "mensagem pronta para enviar como FOLLOW-UP após resposta positiva ao template",
  "analise_nicho": "como o nicho do lead se conecta ao serviço vendido (1-2 frases)",
  "analise_cidade": "mercado e concorrência na região (1-2 frases)",
  "pontos_fracos": ["ponto fraco 1 no contexto do serviço vendido"],
  "estrategia": "estratégia usada (1 frase)",
  "produto_sugerido": "produto/serviço sugerido para este lead (1 frase)"
}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    const parsed = JSON.parse(content);

    // Store the message on the lead
    const { error: updateErr } = await supabase
      .from("leads")
      .update({
        ai_approach_message: parsed.mensagem || "",
        enrichment_data: {
          ...(typeof lead.enrichment_data === 'object' && lead.enrichment_data ? lead.enrichment_data : {}),
          approach_analysis: {
            analise_nicho: parsed.analise_nicho || "",
            analise_cidade: parsed.analise_cidade || "",
            pontos_fracos: parsed.pontos_fracos || [],
            estrategia: parsed.estrategia || "",
            produto_sugerido: parsed.produto_sugerido || "",
            generated_at: new Date().toISOString(),
          },
        },
      })
      .eq("id", lead_id)
      .eq("user_id", user.id);

    if (updateErr) console.error("Update error:", updateErr);

    return new Response(
      JSON.stringify({
        mensagem: parsed.mensagem || "",
        analise_nicho: parsed.analise_nicho || "",
        analise_cidade: parsed.analise_cidade || "",
        pontos_fracos: parsed.pontos_fracos || [],
        estrategia: parsed.estrategia || "",
        produto_sugerido: parsed.produto_sugerido || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Approach error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
