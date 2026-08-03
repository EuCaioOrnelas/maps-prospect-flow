import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildFreeSlots, matchSlot, formatSlotLabel, CALENDAR_TIMEZONE, type FreeSlot } from "./agenda.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "gpt-4o-mini";

async function logAiUsage(p: {
  feature: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const tin = p.usage?.prompt_tokens ?? 0;
    const tout = p.usage?.completion_tokens ?? 0;
    const cost = tin * (0.15 / 1_000_000) + tout * (0.6 / 1_000_000);
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
        model: MODEL,
        user_id: p.user_id ?? null,
        tokens_in: tin,
        tokens_out: tout,
        cost_usd: Number(cost.toFixed(8)),
        metadata: p.metadata ?? {},
      }),
    });
  } catch (_) {
    // custo não pode quebrar o fluxo
  }
}

async function chat(apiKey: string, system: string, user: string, json = true) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.6,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body}`);
  }
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content ?? "", usage: data.usage };
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch { /* ignore */ }
    }
    return {};
  }
}

const TONE_GUIDE: Record<string, string> = {
  consultivo:
    "Consultivo: pergunte antes de afirmar, use as respostas do lead nas próximas frases, traga uma observação útil sobre o negócio dele em cada mensagem. Nada de discurso pronto.",
  profissional:
    "Profissional: frases claras e técnicas, sem gírias, sem exclamações, foco em dado e resultado. Trate por 'você' com respeito e objetividade.",
  descontraido:
    "Descontraído: linguagem do dia a dia, frases curtas, leve informalidade ('bora', 'tranquilo'), mas nunca infantil nem forçado. Continua vendendo.",
  objetivo:
    "Objetivo: máximo de 2 linhas por mensagem, zero rodeio, sempre um próximo passo concreto na última frase.",
};

const FORMALITY_GUIDE: Record<string, string> = {
  baixo: "Formalidade baixa: 'você', contrações naturais, tom de conversa entre conhecidos.",
  medio: "Formalidade média: cordial e profissional, sem gírias e sem rigidez.",
  alto: "Formalidade alta: tratamento respeitoso, sem gírias, sem emojis, estrutura impecável.",
};

const LENGTH_GUIDE: Record<string, string> = {
  curtas: "Cada mensagem com no máximo 2 linhas.",
  medias: "Cada mensagem com 3 a 4 linhas.",
  longas: "Pode explicar com mais detalhe, ainda dividido em mensagens.",
};

const EMOJI_GUIDE: Record<string, string> = {
  nunca: "Nunca use emojis.",
  pouco: "No máximo 1 emoji a cada 3 mensagens, só quando reforçar o sentido.",
  normal: "Emojis leves são permitidos, no máximo 1 por mensagem.",
};

const QUESTION_GUIDE: Record<string, string> = {
  sempre: "Termine praticamente toda resposta com UMA pergunta que avance o objetivo.",
  quando_necessario: "Pergunte apenas quando faltar informação para avançar; caso contrário, conduza afirmando.",
  evitar: "Evite perguntas: conduza com afirmações e propostas de próximo passo.",
};

const OBJECTIVE_PLAYBOOK: Record<string, string> = {
  reuniao:
    "OBJETIVO MARCAR REUNIÃO: toda a conversa converge para uma agenda. Nunca resolva tudo pelo WhatsApp; use a reunião como o lugar onde a dúvida será respondida. Ofereça sempre DUAS janelas concretas (ex.: 'amanhã 10h ou 15h?') e confirme dia, horário e canal. Não fale preço fechado antes da agenda.",
  demonstracao:
    "OBJETIVO AGENDAR DEMONSTRAÇÃO: gere curiosidade mostrando UM resultado prático por vez e transforme cada dúvida em motivo para ver a ferramenta funcionando ('isso eu te mostro na tela em 15 minutos'). Feche com duas opções de horário e confirme quem participará.",
  proposta:
    "OBJETIVO ENVIAR PROPOSTA: antes de enviar qualquer coisa, levante escopo, volume, prazo e quem decide. Só então anuncie o envio, envie e peça confirmação explícita de recebimento, combinando o dia da resposta.",
  venda_direta:
    "OBJETIVO FECHAR VENDA DIRETA: conduza para a decisão na própria conversa. Apresente a oferta certa, trate a objeção e peça o fechamento de forma direta ('te envio o link de pagamento agora?').",
  qualificar:
    "OBJETIVO QUALIFICAR: colete de forma natural (uma pergunta por vez) dor real, impacto/urgência, orçamento aproximado e se a pessoa decide. Não force venda nem agenda; encerre resumindo o diagnóstico e o próximo passo.",
  recuperar:
    "OBJETIVO RECUPERAR: retome o contexto anterior sem cobrar o lead ('vi que paramos em X'). Traga um motivo novo para retomar, reduza o atrito do próximo passo e reagende. Nunca repita a abordagem anterior.",
};

const INSISTENCE_GUIDE: Record<string, string> = {
  pouco: "Insistência baixa: diante de um 'agora não', acolha e recue na primeira negativa.",
  medio: "Insistência média: tente contornar no máximo duas vezes com ângulos diferentes antes de recuar.",
  muito: "Insistência alta: continue trazendo novos ângulos de valor até o lead decidir, sem ser grosseiro nem repetitivo.",
};

const RETURN_GUIDE: Record<string, string> = {
  imediato: "Após responder qualquer dúvida, volte ao objetivo na MESMA mensagem.",
  natural: "Converse um pouco e retome o objetivo assim que fizer sentido no fluxo.",
  abertura: "Só retome o objetivo quando o lead demonstrar algum sinal de interesse.",
};

const OBJECTION_GUIDE: Record<string, string> = {
  contornar: "Diante de objeção: reformule o valor de forma curta e siga direto para o próximo passo.",
  explorar: "Diante de objeção: pergunte o motivo real por trás dela antes de responder.",
  validar: "Diante de objeção: concorde e acolha primeiro, depois apresente a saída.",
  vendedor: "Diante de objeção relevante: avise que um especialista humano vai assumir e defina proxima_acao = chamar_vendedor.",
};

const PIPELINE_STEPS = `1. conexao — quebrar o gelo e gerar confiança
2. necessidade — entender a dor real do lead
3. valor — mostrar como a solução resolve a dor
4. objecoes — tratar dúvidas e travas
5. fechamento — conduzir para o objetivo final`;

function agentBrief(agent: any) {
  const k = agent.knowledge ?? {};
  const p = agent.personality ?? {};
  const s = agent.strategy ?? {};
  const c = agent.closing ?? {};
  const t = agent.triggers ?? {};
  const products = Array.isArray(k.products_list)
    ? k.products_list
        .filter((x: any) => x?.name)
        .map(
          (x: any) =>
            `- ${x.name}${x.price ? ` (${x.price})` : ""}: ${x.description || "-"} | OFERECER QUANDO: ${x.when_to_offer || "-"}`
        )
        .join("\n")
    : "";
  const links = Array.isArray(k.links_list)
    ? k.links_list
        .filter((x: any) => x?.url)
        .map((x: any) => `- ${x.url} | USAR QUANDO: ${x.when_to_use || "-"}`)
        .join("\n")
    : "";
  return `
NOME DO SDR: ${agent.name}
OBJETIVO FINAL: ${agent.objective}
CRITÉRIO DE SUCESSO: ${(c.success_criteria || []).join(", ") || "-"}

EMPRESA: ${k.company || "-"}
NICHO: ${k.niche || "-"} | PÚBLICO-ALVO: ${k.audience || "-"}
DIFERENCIAIS: ${k.differentials || "-"}
PRODUTOS:
${products || k.products || "-"}
CASES: ${k.cases || "-"}
FAQ (pergunta => resposta oficial):
${
    Array.isArray(k.faq_list) && k.faq_list.some((f: any) => f?.question)
      ? k.faq_list
          .filter((f: any) => f?.question)
          .map((f: any) => `- P: ${f.question}\n  R: ${f.answer || "-"}`)
          .join("\n")
      : k.faq || "-"
  }
POLÍTICAS: ${k.policies || "-"}
CONCORRENTES: ${k.competitors || "-"}
SITE: ${k.site || "-"} | INSTAGRAM: ${k.instagram || "-"}
LINKS DE APOIO:
${links || "-"}

ESTILO OBRIGATÓRIO:
${TONE_GUIDE[p.tone] ?? ""}
${FORMALITY_GUIDE[p.formality] ?? ""}
${LENGTH_GUIDE[p.length] ?? ""}
${EMOJI_GUIDE[p.emojis] ?? ""}
${QUESTION_GUIDE[p.questions] ?? ""}

REGRAS INEGOCIÁVEIS:
- O SDR SEMPRE conduz a conversa e nunca devolve o comando ao lead.
- NUNCA esperar o lead decidir sozinho: toda resposta termina com um próximo passo claro.
- Nunca inventar informação fora do conhecimento acima.
${(agent.situations ?? {}).preco === "nunca_sem_reuniao" ? "- NUNCA informar preço antes de a reunião estar agendada." : ""}

PLAYBOOK DO OBJETIVO:
${OBJECTIVE_PLAYBOOK[agent.objective] ?? "Conduza a conversa até o objetivo configurado."}

FUNIL OBRIGATÓRIO (avance um passo por vez, sem pular etapas):
${PIPELINE_STEPS}

ESTRATÉGIA: insistência ${s.insistence}; voltar ao objetivo ${s.return_to_goal}; objeções: ${s.on_objection}.
${INSISTENCE_GUIDE[s.insistence] ?? ""}
${RETURN_GUIDE[s.return_to_goal] ?? ""}
${OBJECTION_GUIDE[s.on_objection] ?? ""}
GATILHOS DE ATIVAÇÃO: ${(t.activation || []).join(", ") || "inbound_all"}.
ENCERRAMENTO: parar quando ${(c.stop_criteria || []).join(", ")}${c.stop_no_reply_hours ? ` (sem resposta por ${c.stop_no_reply_hours}h)` : ""}; follow-ups até ${c.followup_max} em modo ${c.followup_mode}${c.followup_mode === "inteligente" ? ` (intervalo variável entre ${c.followup_min_hours ?? 12}h e ${c.followup_max_hours ?? 48}h, sempre dentro do horário de atendimento)` : ""}.
SITUAÇÕES CONFIGURADAS: ${JSON.stringify(agent.situations ?? {})}
`.trim();
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim() ?? "";
    // Modo interno: chamadas server-to-server (webhook, cron) usam a service role key
    const isInternal = token === serviceKey;
    let user: { id: string } | null = null;

    if (!isInternal) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error: authError } = await supabase.auth.getUser(token);
      if (authError || !data?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = data.user;
    }


    const body = await req.json();
    const agentId: string = body.agentId;
    const inbound: string = body.message ?? "";
    const triggerType: string = body.triggerType ?? "inbound"; // inbound | outbound | followup
    const history: { role: string; content: string }[] = body.history ?? [];
    const leadContext = body.leadContext ?? {};
    const sessionId: string | null = body.sessionId ?? null;
    const persist: boolean = body.persist !== false;

    if (!agentId) {
      return new Response(JSON.stringify({ error: "agentId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: agent, error: agentError } = await supabase
      .from("sdr_agents")
      .select("*")
      .eq("id", agentId)
      .maybeSingle();
    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "SDR não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica acesso: dono da conta ou membro (ignorado no modo interno)
    const { data: ownerCheck } = user
      ? await supabase.rpc("get_account_owner", { _uid: user.id })
      : { data: null };
    if (user && agent.owner_user_id !== user.id && agent.owner_user_id !== ownerCheck) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let session: any = null;
    if (sessionId) {
      const { data } = await supabase.from("sdr_sessions").select("*").eq("id", sessionId).maybeSingle();
      session = data;
    }

    const brief = agentBrief(agent);
    const historyText =
      history.map((m) => `${m.role === "assistant" ? "SDR" : "LEAD"}: ${m.content}`).join("\n") ||
      "(sem histórico)";

    // ---------- CAMADAS 1-5: Contexto, Memória, Compreensão, Planejamento, Estratégia ----------
    const analysisSystem = `Você é o cérebro analítico de um SDR de alta performance no WhatsApp (B2B).
Você NÃO escreve a resposta ao lead. Você apenas analisa e decide a estratégia.
Você SEMPRE identifica em qual passo do funil a conversa está (conexao, necessidade, valor, objecoes, fechamento), inclusive em follow-ups e reaberturas, e define o próximo passo sem pular etapas.
Responda SEMPRE em JSON válido com o formato:
{
 "memoria": {"fatos": [string], "promessas": [string], "objecoes": [string]},
 "intencao": string,
 "sentimento": "positivo|neutro|negativo",
 "dor": string,
 "abertura": "alta|media|baixa",
 "estagio": "nao_conhece|conhece|interesse|comparando|negociando|pronto|recusou",
 "cenarios": [{"resposta": string, "probabilidade_de_continuar": number}],
 "passo_atual": "conexao|necessidade|valor|objecoes|fechamento",
 "proximo_passo": "conexao|necessidade|valor|objecoes|fechamento",
 "micro_objetivo": string,
 "estrategia": string,
 "proxima_acao": "responder|aguardar|followup|chamar_vendedor|encerrar"
}`;
    const analysisUser = `CONFIGURAÇÃO DO SDR:
${brief}

CONTEXTO DO LEAD:
${JSON.stringify(leadContext)}

MEMÓRIA ATUAL:
${JSON.stringify(session?.memory ?? {})}

HISTÓRICO:
${historyText}

PASSO DO FUNIL NA ÚLTIMA INTERAÇÃO: ${session?.stage ?? "conexao"}
GATILHO: ${triggerType}
NOVA MENSAGEM DO LEAD: ${inbound || "(nenhuma — conversa iniciada pelo SDR)"}

Analise em profundidade, projete pelo menos 2 cenários de resposta com probabilidade de continuidade e escolha o micro-objetivo desta resposta.`;

    const analysisRes = await chat(openaiApiKey, analysisSystem, analysisUser);
    const analysis = safeJson(analysisRes.content);
    await logAiUsage({
      feature: "sdr_brain_analysis",
      usage: analysisRes.usage,
      user_id: user?.id ?? agent.owner_user_id,
      metadata: { agent_id: agentId },
    });

    // ---------- CAMADAS 6-7: Redação + Estruturação em mensagens curtas ----------
    const writerSystem = `Você é um SDR humano experiente conversando pelo WhatsApp.
Regras absolutas:
- NUNCA escreva textão. Divida em 2 a 4 mensagens curtas e naturais.
- Cada mensagem tem um único assunto (saudação, contexto, pergunta, CTA).
- Nunca invente informações que não estejam no conhecimento fornecido.
- Faça no máximo UMA pergunta por resposta.
- Siga o micro-objetivo e o passo do funil definidos pela análise, sem forçar a venda nem pular etapas.
- Em follow-ups, retome explicitamente o ponto onde a conversa parou.
Responda SEMPRE em JSON: {"mensagens": [string], "proxima_acao": string, "justificativa": string}`;
    const writerUser = `CONFIGURAÇÃO DO SDR:
${brief}

ANÁLISE E ESTRATÉGIA:
${JSON.stringify(analysis)}

HISTÓRICO:
${historyText}

MENSAGEM DO LEAD: ${inbound || "(primeiro contato / follow-up)"}

Escreva a sequência de mensagens.`;

    const writerRes = await chat(openaiApiKey, writerSystem, writerUser);
    const written = safeJson(writerRes.content);
    await logAiUsage({
      feature: "sdr_brain_writer",
      usage: writerRes.usage,
      user_id: user?.id ?? agent.owner_user_id,
      metadata: { agent_id: agentId },
    });

    let messages: string[] = Array.isArray(written.mensagens)
      ? written.mensagens.filter((m: any) => typeof m === "string" && m.trim())
      : [];

    // ---------- CAMADA 8: Validação / Autocrítica ----------
    const validatorSystem = `Você é um revisor crítico de mensagens de vendas no WhatsApp.
Checklist: respondeu o lead? avançou a negociação? manteve contexto? objetivo continua vivo? soa humano? mensagens curtas? educada? não insistiu demais? criou valor? tem próximo passo?
Se reprovar em qualquer item, reescreva.
Responda SEMPRE em JSON: {"aprovado": boolean, "checklist": {"[item]": boolean}, "mensagens_finais": [string], "motivo": string}`;
    const validatorUser = `CONFIGURAÇÃO:
${brief}

MICRO-OBJETIVO: ${analysis.micro_objetivo ?? "-"}

MENSAGENS PROPOSTAS:
${JSON.stringify(messages)}

HISTÓRICO:
${historyText}`;

    const validationRes = await chat(openaiApiKey, validatorSystem, validatorUser);
    const validation = safeJson(validationRes.content);
    await logAiUsage({
      feature: "sdr_brain_validator",
      usage: validationRes.usage,
      user_id: user?.id ?? agent.owner_user_id,
      metadata: { agent_id: agentId },
    });

    if (Array.isArray(validation.mensagens_finais) && validation.mensagens_finais.length) {
      messages = validation.mensagens_finais.filter((m: any) => typeof m === "string" && m.trim());
    }

    // ---------- CAMADA 9: Execução (registro) ----------
    let runId: string | null = null;
    if (persist) {
      const { data: run } = await supabase
        .from("sdr_runs")
        .insert({
          agent_id: agentId,
          session_id: session?.id ?? null,
          owner_user_id: agent.owner_user_id,
          trigger_type: triggerType,
          inbound_message: inbound || null,
          analysis,
          strategy: {
            micro_objetivo: analysis.micro_objetivo,
            estrategia: analysis.estrategia,
            proxima_acao: written.proxima_acao ?? analysis.proxima_acao,
          },
          validation,
          messages,
        })
        .select("id")
        .maybeSingle();
      runId = run?.id ?? null;

      if (session?.id) {
        await supabase
          .from("sdr_sessions")
          .update({
            stage: analysis.proximo_passo ?? analysis.passo_atual ?? analysis.estagio ?? session.stage,
            current_goal: analysis.micro_objetivo ?? session.current_goal,
            memory: analysis.memoria ?? session.memory,
            messages_sent: (session.messages_sent ?? 0) + messages.length,
            replies_received: (session.replies_received ?? 0) + (inbound ? 1 : 0),
            last_message_at: new Date().toISOString(),
            ...(inbound ? { last_reply_at: new Date().toISOString() } : {}),
          })
          .eq("id", session.id);
      }
    }

    return new Response(
      JSON.stringify({
        run_id: runId,
        analysis,
        strategy: {
          micro_objetivo: analysis.micro_objetivo,
          estrategia: analysis.estrategia,
        },
        validation,
        messages,
        next_action: written.proxima_acao ?? analysis.proxima_acao ?? "aguardar",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[sdr-brain]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
