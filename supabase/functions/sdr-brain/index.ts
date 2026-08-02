import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function agentBrief(agent: any) {
  const k = agent.knowledge ?? {};
  const p = agent.personality ?? {};
  const s = agent.strategy ?? {};
  const c = agent.closing ?? {};
  return `
NOME DO SDR: ${agent.name}
OBJETIVO FINAL: ${agent.objective === "outro" ? agent.objective_custom : agent.objective}

EMPRESA: ${k.company || "-"}
PRODUTOS/SERVIÇOS: ${k.products || "-"}
DIFERENCIAIS: ${k.differentials || "-"}
CASES: ${k.cases || "-"}
FAQ: ${k.faq || "-"}
POLÍTICAS: ${k.policies || "-"}
CONCORRENTES: ${k.competitors || "-"}
SITE: ${k.site || "-"} | INSTAGRAM: ${k.instagram || "-"}

PERSONALIDADE: tom ${p.tone}, formalidade ${p.formality}, respostas ${p.length}, emojis ${p.emojis}, perguntas ${p.questions}.
CONDUÇÃO: ${p.leads_conversation ? "o SDR sempre conduz a conversa" : "o SDR acompanha o ritmo do lead"}.

ESTRATÉGIA: prioridades ${(s.priorities || []).join(" > ")}; insistência ${s.insistence}; voltar ao objetivo ${s.return_to_goal}; objeções: ${s.on_objection}.
ENCERRAMENTO: sucesso = ${(c.success_criteria || []).join(", ")}; parar = ${(c.stop_criteria || []).join(", ")}; follow-ups até ${c.followup_max}.
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

    // Verifica acesso: dono da conta ou membro
    const { data: ownerCheck } = await supabase.rpc("get_account_owner", { _uid: user.id });
    if (agent.owner_user_id !== user.id && agent.owner_user_id !== ownerCheck) {
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
Responda SEMPRE em JSON válido com o formato:
{
 "memoria": {"fatos": [string], "promessas": [string], "objecoes": [string]},
 "intencao": string,
 "sentimento": "positivo|neutro|negativo",
 "dor": string,
 "abertura": "alta|media|baixa",
 "estagio": "nao_conhece|conhece|interesse|comparando|negociando|pronto|recusou",
 "cenarios": [{"resposta": string, "probabilidade_de_continuar": number}],
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

GATILHO: ${triggerType}
NOVA MENSAGEM DO LEAD: ${inbound || "(nenhuma — conversa iniciada pelo SDR)"}

Analise em profundidade, projete pelo menos 2 cenários de resposta com probabilidade de continuidade e escolha o micro-objetivo desta resposta.`;

    const analysisRes = await chat(openaiApiKey, analysisSystem, analysisUser);
    const analysis = safeJson(analysisRes.content);
    await logAiUsage({
      feature: "sdr_brain_analysis",
      usage: analysisRes.usage,
      user_id: user.id,
      metadata: { agent_id: agentId },
    });

    // ---------- CAMADAS 6-7: Redação + Estruturação em mensagens curtas ----------
    const writerSystem = `Você é um SDR humano experiente conversando pelo WhatsApp.
Regras absolutas:
- NUNCA escreva textão. Divida em 2 a 4 mensagens curtas e naturais.
- Cada mensagem tem um único assunto (saudação, contexto, pergunta, CTA).
- Nunca invente informações que não estejam no conhecimento fornecido.
- Faça no máximo UMA pergunta por resposta.
- Siga o micro-objetivo definido pela análise, sem forçar a venda.
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
      user_id: user.id,
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
      user_id: user.id,
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
            stage: analysis.estagio ?? session.stage,
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
