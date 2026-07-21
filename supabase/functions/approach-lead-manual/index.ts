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

    const prompt = `Você é um copywriter sênior de vendas B2B especializado em COLD OUTREACH manual (WhatsApp/e-mail direto).
Sua missão: escrever a PRIMEIRA mensagem que o vendedor vai enviar À MÃO para este lead.

CONTEXTO CRÍTICO:
- Esta mensagem NÃO passa por template oficial da Meta. É envio manual, cru, humano.
- O dono/gestor do negócio é OCUPADO. Se os primeiros 8-10 segundos não gerarem desejo, ele descarta.
- Não pode parecer copy pronta. Não pode ser genérica. Não pode ser "mais um vendedor".
- Precisa parecer uma mensagem PENSADA, ESPECÍFICA, com um insight real.

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

═══ ESTRUTURA OBRIGATÓRIA (6 blocos, separados por \\n\\n) ═══
Escreva UMA mensagem contínua, em 5 a 7 linhas totais, que contemple internamente estes 6 elementos NA ORDEM:

1. GANCHO (peso 40%): Primeira frase precisa gerar CURIOSIDADE ou DESEJO imediato.
   - NUNCA comece com "Olá", "Oi tudo bem", "Bom dia", cumprimento temporal, ou apresentação.
   - Pode começar com: uma observação específica sobre o negócio ("Vi que a [empresa] tem [algo notado]…"),
     uma pergunta provocativa consultiva, ou um dado da região/nicho que gere identificação instantânea.
   - Regra: se o gancho fosse a ÚNICA linha lida, já teria que despertar interesse.

2. APRESENTAÇÃO (peso 15%): 1 linha curta dizendo QUEM você é e o que faz.
   - Ex: "Sou ${companyProfile?.attendant_name || "[nome]"} da ${companyProfile?.company_name || "[empresa]"} — [1 frase do que faz]."
   - SEM crachá corporativo, SEM títulos pomposos.

3. MOTIVO (peso 20%): Por que você está falando com ESTA empresa especificamente.
   - Deve mostrar personalização real (cidade, nicho, tamanho, algo do diagnóstico).
   - NÃO vale "estou entrando em contato com empresas do seu segmento" — isso é genérico e mata a conversa.

4. INSIGHT (peso 15%): Uma observação CONSULTIVA — algo que mostra que estudou.
   - Pode ser: um dado do mercado local, uma tendência do nicho, um ponto fraco/oportunidade detectado no diagnóstico,
     ou algo específico do site/redes do lead.
   - Fale como consultor, NÃO como vendedor. NÃO ofereça a solução aqui ainda.

5. BAIXA PRESSÃO (peso 5%): 1 frase que desarma a defesa. Ex: "Sem compromisso nenhum",
   "Não é pra vender nada agora", "Só queria trocar uma ideia rápida".

6. CTA LEVE (peso 5%): Uma pergunta simples que exige resposta CURTA.
   - Ex: "Faz sentido conversarmos 10 min essa semana?", "Posso te mandar um exemplo rápido?",
     "Se eu te mostrar em 2 min como funciona, tudo bem?"
   - NUNCA peça reunião longa, agenda, formulário, ligação imediata.

═══ REGRAS DURAS ═══
- ⛔ PROIBIDO: "Bom dia", "Boa tarde", "Boa noite", "Tudo bem?", "Como vai?", "Espero que esteja tudo bem"
- ⛔ PROIBIDO: emojis em excesso (no máximo 1, e só se ficar natural)
- ⛔ PROIBIDO: MAIÚSCULAS gritando, "!!!!", "??", venda agressiva
- ⛔ PROIBIDO: falar de nada que ${companyProfile?.company_name || "a empresa"} NÃO vende
- ⛔ PROIBIDO: pedir "atenção", "5 minutinhos", pedir desculpa por incomodar
- ✅ Máx 7 linhas. Frases curtas. Ritmo humano. Como um consultor experiente escreveria em 30 segundos.
- ✅ Assine no final com o nome: "— ${companyProfile?.attendant_name || "[seu nome]"} | ${companyProfile?.company_name || "[empresa]"}"
- ✅ Se o lead tem ponto fraco claro, use-o como gancho. Se não tem, use cidade + nicho + diagnóstico regional.

VARIAÇÃO NATURAL (SEED: ${uniqueSeed}) — a mensagem deve ser única para ESTE lead, variando gancho e CTA.

Retorne APENAS JSON válido:
{
  "mensagem": "mensagem manual completa pronta para colar no WhatsApp",
  "gancho": "a primeira frase da mensagem (para auditoria)",
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
