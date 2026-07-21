// Gera a MENSAGEM DE PRIMEIRO CONTATO manual (não é template Meta, não é follow-up).
// Copy pensada para ser enviada à mão (WhatsApp/e-mail) e gerar desejo nos primeiros segundos,
// pois donos de empresa são ocupados e descartam mensagens genéricas.
//
// Estrutura obrigatória (6 blocos):
//   1. Gancho    (40% do impacto) — primeira frase gera curiosidade/desejo IMEDIATAMENTE
//   2. Apresentação (15%)         — quem é / de onde, em 1 linha, sem crachá corporativo
//   3. Motivo    (20%)            — por que ESTA empresa foi escolhida (personalização real)
//   4. Insight   (15%)            — 1 dado/observação consultiva que mostra que estudou
//   5. Baixa pressão (5%)         — deixa claro que não é abordagem invasiva
//   6. CTA leve  (5%)             — pergunta simples que exige resposta curta ("sim" / "faz sentido?")

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

    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadErr } = await supabase
      .from("leads").select("*").eq("id", lead_id).eq("user_id", user.id).single();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: companyProfile } = await supabase
      .from("company_profiles").select("*").eq("user_id", user.id).single();

    const enrichment = lead.enrichment_data && typeof lead.enrichment_data === "object" ? lead.enrichment_data as Record<string, any> : {};
    const pontosFortes = Array.isArray(enrichment.pontos_fortes) ? enrichment.pontos_fortes : [];
    const pontosFracos = Array.isArray(enrichment.pontos_fracos) ? enrichment.pontos_fracos : [];
    const analiseSite = enrichment.analise_site || "";
    const analiseRedes = enrichment.analise_redes_sociais || "";
    const analiseConcorrencia = enrichment.analise_concorrencia_regional || "";
    const analiseDemanda = enrichment.analise_demanda_regional || "";
    const socialMedia = Array.isArray(lead.social_media) ? lead.social_media : [];
    const hasSite = !!lead.website && lead.website !== "-";

    const companyContext = companyProfile ? `
⚠️ PERFIL DA EMPRESA QUE ESTÁ PROSPECTANDO:
- Empresa: ${companyProfile.company_name}
- Atendente/Vendedor: ${companyProfile.attendant_name}
- Nicho: ${companyProfile.company_niche}
- Produtos/Serviços VENDIDOS: ${companyProfile.company_products}
- Diferencial: ${companyProfile.company_differential}
- Objetivo: ${companyProfile.company_objective}
- Público-alvo: ${companyProfile.company_target_audience}

REGRA ABSOLUTA: A mensagem DEVE girar em torno de "${companyProfile.company_products}". NUNCA mencione algo que a empresa NÃO vende.
` : "";

    const diagnosticContext = (lead.ai_score || lead.ai_diagnosis) ? `
═══ DIAGNÓSTICO DESTE LEAD (use como munição para o insight) ═══
- Score: ${lead.ai_score || "N/A"} | Nível: ${lead.opportunity_level || "N/A"}
- Diagnóstico: ${lead.ai_diagnosis || "N/A"}
${pontosFortes.length ? `- Pontos fortes: ${pontosFortes.join("; ")}` : ""}
${pontosFracos.length ? `- Pontos fracos: ${pontosFracos.join("; ")}` : ""}
${analiseSite ? `- Site: ${analiseSite}` : ""}
${analiseRedes ? `- Redes sociais: ${analiseRedes}` : ""}
${analiseConcorrencia ? `- Concorrência regional: ${analiseConcorrencia}` : ""}
${analiseDemanda ? `- Demanda regional: ${analiseDemanda}` : ""}
` : "";

    const uniqueSeed = crypto.randomUUID().slice(0, 8);

    const prompt = `Você é um copywriter sênior de vendas B2B especializado em COLD OUTREACH manual pelo WhatsApp.
Sua missão: escrever a PRIMEIRA mensagem que o vendedor vai enviar À MÃO para este lead.

CONTEXTO CRÍTICO:
- Envio manual, humano, natural. Precisa parecer escrita por uma pessoa real, não um robô.
- O dono/gestor é OCUPADO. Mensagem tem que ser educada, respeitosa e ao mesmo tempo interessante.
- Precisa gerar CURIOSIDADE e DESEJO, mas sem parecer venda agressiva ou copy pronta.
- A mensagem deve ter RITMO, com QUEBRAS DE LINHA que facilitem a leitura no WhatsApp.

${companyContext}
${diagnosticContext}

DADOS DO LEAD:
- Empresa: ${lead.company_name || "N/A"}
- Contato: ${lead.contact_name || "responsável"}
- Nicho: ${lead.category || "N/A"}
- Cidade: ${lead.city || "N/A"}
- Endereço: ${lead.address || "N/A"}
- Avaliação Google: ${lead.rating || 0}/5 (${lead.review_count || 0} avaliações)
- Site: ${hasSite ? lead.website : "não tem"}
- Redes: ${socialMedia.length ? socialMedia.join(", ") : "não localizadas"}

═══ ESTRUTURA DA MENSAGEM (respeite a ordem e as quebras de linha) ═══

BLOCO 1 — SAUDAÇÃO CURTA E EDUCADA (1 linha)
- Comece com "Olá!" ou "Oi, tudo bem?" ou "Olá, [nome do contato se souber]!"
- Nada de "Bom dia/Boa tarde/Boa noite" (a hora do envio é imprevisível).
- Uma linha só. Depois quebre linha em branco.

BLOCO 2 — APRESENTAÇÃO CURTA (1 a 2 linhas)
- "Meu nome é ${companyProfile?.attendant_name || "[nome]"}, sou da ${companyProfile?.company_name || "[empresa]"}."
- Se fizer sentido, complemente em UMA frase o que a empresa faz (foco em ${companyProfile?.company_products || "solução"}).
- Sem crachá, sem títulos pomposos. Depois quebre linha em branco.

BLOCO 3 — GANCHO PERSONALIZADO / MOTIVO (2 a 3 linhas)
- Aqui está o coração da mensagem. Explique por que está falando com ESTA empresa.
- Use algo específico: cidade, nicho, algo do site/redes, um ponto forte notado ou uma oportunidade real detectada no diagnóstico.
- Deve gerar identificação: "vi que...", "reparei que...", "acompanhei um pouco...".
- Nunca diga "estou entrando em contato com empresas do seu segmento" (genérico, mata a conversa).
- Depois quebre linha em branco.

BLOCO 4 — INSIGHT CONSULTIVO (1 a 2 linhas)
- Uma observação de consultor, não de vendedor.
- Pode ser uma tendência do nicho, um dado da região, ou algo que a empresa poderia estar aproveitando melhor.
- Não ofereça a solução aqui ainda. Só planta a ideia.
- Depois quebre linha em branco.

BLOCO 5 — CTA LEVE COM BAIXA PRESSÃO (1 a 2 linhas)
- Deixe claro que não é pra vender nada agora. Ex: "sem compromisso", "só queria trocar uma ideia rápida".
- Faça uma pergunta simples que exija resposta CURTA. Ex: "Faz sentido eu te mandar um exemplo rápido?", "Posso te explicar em 2 minutinhos como funciona?".
- Nunca peça reunião longa, agenda, ligação imediata ou formulário.
- Depois quebre linha em branco.

BLOCO 6 — ASSINATURA (1 linha)
- Encerre com o nome: "${companyProfile?.attendant_name || "[seu nome]"} | ${companyProfile?.company_name || "[empresa]"}"

═══ REGRAS DE FORMATAÇÃO (OBRIGATÓRIAS) ═══
- Use \\n\\n (linha em branco) entre CADA bloco. A mensagem final DEVE ter respiros visíveis.
- Frases curtas e diretas. Sem parágrafos longos.
- ⛔ NUNCA use travessão duplo "--" no meio de frases. Se precisar pausar, use vírgula ou ponto.
- ⛔ NUNCA use travessão "—" no meio da frase. Reserve o "—" apenas para a assinatura final se quiser.
- ⛔ NUNCA use "Bom dia", "Boa tarde", "Boa noite", "Espero que esteja tudo bem".
- ⛔ NUNCA use MAIÚSCULAS gritando, "!!!!", "??", venda agressiva, urgência falsa.
- ⛔ NUNCA fale de nada que ${companyProfile?.company_name || "a empresa"} NÃO vende.
- ⛔ NUNCA peça "atenção", "5 minutinhos", nem se desculpe por incomodar.
- ✅ Máximo 1 emoji na mensagem inteira, e SÓ se ficar natural. Pode não usar nenhum.
- ✅ Tom: consultor experiente, educado, humano, curioso pelo negócio do outro.

VARIAÇÃO NATURAL (SEED: ${uniqueSeed}) — a mensagem deve ser única para ESTE lead, variando saudação, gancho e CTA.

Retorne APENAS JSON válido (use \\n\\n entre blocos dentro do campo "mensagem"):
{
  "mensagem": "mensagem completa já formatada com quebras de linha, pronta para colar no WhatsApp",
  "gancho": "a frase de gancho do bloco 3 (para auditoria)",
  "motivo": "por que este lead foi escolhido (1 frase)",
  "insight": "o insight consultivo usado (1 frase)",
  "estrategia": "estratégia geral da copy (1 frase)"
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
        temperature: 0.85,
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

    const newEnrichment = {
      ...(typeof lead.enrichment_data === "object" && lead.enrichment_data ? lead.enrichment_data : {}),
      manual_approach: {
        message: parsed.mensagem || "",
        gancho: parsed.gancho || "",
        motivo: parsed.motivo || "",
        insight: parsed.insight || "",
        estrategia: parsed.estrategia || "",
        generated_at: new Date().toISOString(),
      },
    };

    const { error: updateErr } = await supabase
      .from("leads")
      .update({ enrichment_data: newEnrichment })
      .eq("id", lead_id)
      .eq("user_id", user.id);

    if (updateErr) console.error("Update error:", updateErr);

    return new Response(
      JSON.stringify({
        mensagem: parsed.mensagem || "",
        gancho: parsed.gancho || "",
        motivo: parsed.motivo || "",
        insight: parsed.insight || "",
        estrategia: parsed.estrategia || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Approach-manual error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
