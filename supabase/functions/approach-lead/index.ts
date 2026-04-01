import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    // Build personalized prompt with company context
    const companyContext = companyProfile ? `
DADOS DA SUA EMPRESA (quem está prospectando):
- Empresa: ${companyProfile.company_name}
- Atendente: ${companyProfile.attendant_name}
- Nicho: ${companyProfile.company_niche}
- Diferencial: ${companyProfile.company_differential}
- Objetivo: ${companyProfile.company_objective}
- Produtos/Serviços: ${companyProfile.company_products}
- Público-alvo: ${companyProfile.company_target_audience}
` : "";

    const prompt = `Você é um especialista em vendas B2B e prospecção comercial. Analise os dados deste lead e crie uma MENSAGEM DE ABORDAGEM personalizada para enviar via WhatsApp.

${companyContext}

DADOS DO LEAD (empresa a ser prospectada):
- Empresa: ${lead.company_name || "Não informado"}
- Categoria/Nicho: ${lead.category || "Não informado"}
- Cidade: ${lead.city || "Não informado"}
- Endereço: ${lead.address || "Não informado"}
- Avaliação Google: ${lead.rating || 0}/5 (${lead.review_count || 0} avaliações)
- Possui site: ${hasSite ? "Sim" : "Não"}
- Redes sociais: ${socialMedia.length > 0 ? socialMedia.join(", ") : "Nenhuma"}
- Score de oportunidade: ${lead.ai_score || "Não calculado"}/100
- Nível de oportunidade: ${lead.opportunity_level || "Não calculado"}

INSTRUÇÕES CRÍTICAS:
1. ${companyProfile ? `Você está representando a empresa "${companyProfile.company_name}" e o atendente "${companyProfile.attendant_name}". A mensagem DEVE ser enviada em nome deles.` : "Crie uma mensagem genérica de prospecção."}
2. ${companyProfile ? `Analise o que a empresa "${companyProfile.company_name}" vende (${companyProfile.company_products}) e identifique qual produto/serviço é MAIS RELEVANTE para este lead baseado no nicho dele.` : ""}
3. ${companyProfile ? `Use o diferencial da empresa ("${companyProfile.company_differential}") como argumento de valor na mensagem.` : ""}
4. A mensagem NÃO deve ser padrão ou genérica — deve ser criativa e FORA DO COMUM
5. Comece com algo que gere CURIOSIDADE imediata (nunca "Olá, tudo bem?" ou aberturas genéricas)
6. No corpo, gere DESEJO mostrando como o produto/serviço pode beneficiar especificamente este lead
7. Termine com uma pergunta gentil se o lead gostaria de saber mais (sem pressão)
8. Seja GENTIL e PROFISSIONAL, mas com personalidade
9. A mensagem deve ser curta (máx 3 parágrafos), direta e personalizada
10. Mencione algo específico sobre a empresa do lead para mostrar que pesquisou
11. ${companyProfile ? `Assine como "${companyProfile.attendant_name}" da "${companyProfile.company_name}"` : ""}

Retorne APENAS um JSON válido com as chaves:
- "mensagem": a mensagem de abordagem pronta para enviar
- "analise_nicho": breve análise do nicho (1-2 frases)
- "analise_cidade": análise do mercado na cidade (1-2 frases)
- "pontos_fracos": lista de pontos fracos identificados
- "estrategia": estratégia de abordagem usada (1 frase)
- "produto_sugerido": qual produto/serviço da empresa foi sugerido para este lead (1 frase)`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
