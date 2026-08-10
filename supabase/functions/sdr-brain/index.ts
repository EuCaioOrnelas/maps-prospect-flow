import { createClient } from "npm:@supabase/supabase-js@2.49.1";

// ========== INLINED AI KEY CRYPTO (sem _shared) ==========
// Decriptação AES-256-GCM da chave OpenAI do cliente (BYOK).
function masterSecrets(): string[] {
  const list: string[] = [];
  const primary = Deno.env.get("AI_CREDENTIALS_SECRET");
  if (primary) list.push(primary);
  const fallback = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (fallback) list.push(`wiize-ai-byok::${fallback}`);
  if (!list.length) throw new Error("Ambiente sem chave mestra para criptografia.");
  return list;
}

async function masterKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function decryptApiKey(stored: string): Promise<string> {
  const buf = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const iv = buf.subarray(0, 12);
  const cipher = buf.subarray(12);
  let lastError: unknown = null;
  for (const secret of masterSecrets()) {
    try {
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await masterKey(secret), cipher);
      return new TextDecoder().decode(plain);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("Falha ao decriptar a chave de IA.");
}
// ========== FIM INLINED AI KEY CRYPTO ==========

interface FreeSlot {
  iso: string;
  label: string;
}

const CALENDAR_TIMEZONE = "America/Sao_Paulo";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MODEL = "gpt-4o-mini";
const COST_PER_MODEL: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4.1-mini": { in: 0.4, out: 1.6 },
  "gpt-4.1": { in: 2, out: 8 },
};

async function logAiUsage(p: {
  feature: string;
  model?: string;
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
    const model = p.model ?? DEFAULT_MODEL;
    const price = COST_PER_MODEL[model] ?? COST_PER_MODEL[DEFAULT_MODEL];
    const cost = tin * (price.in / 1_000_000) + tout * (price.out / 1_000_000);
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

async function chat(apiKey: string, model: string, system: string, user: string, json = true) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
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
  sempre: "Termine praticamente toda resposta com UMA pergunta que avance o objetivo, exceto quando o lead recusar, pedir para parar ou demonstrar desinteresse; nesse caso, apenas acolha e encerre sem nova pergunta.",
  quando_necessario: "Pergunte apenas quando faltar informação para avançar; caso contrário, conduza afirmando.",
  evitar: "Evite perguntas: conduza com afirmações e propostas de próximo passo.",
};

const SITUATION_GUIDE: Record<string, Record<string, string>> = {
  ocupado: {
    aguardar: "Se o lead estiver ocupado, acolha e encerre o contato atual sem pressionar.",
    uma_pergunta: "Se o lead estiver ocupado, faça no máximo uma pergunta diagnóstica fechada e curta, somente se houver abertura.",
    outro_horario: "Se o lead estiver ocupado, ofereça duas janelas reais da agenda para retomar.",
  },
  concorrente: {
    descobrir: "Se o lead usa concorrente, descubra com uma pergunta A/B o que funciona e o que ainda limita o resultado; nunca ataque a solução atual.",
    comparar: "Se o lead usa concorrente, compare apenas diferenças verificáveis cadastradas, sem depreciar terceiros.",
    reuniao: "Se o lead usa concorrente, conecte uma lacuna comprovada a uma reunião e ofereça duas janelas reais.",
  },
  preco: {
    nunca_sem_reuniao: "Se perguntarem preço, não informe valores antes da reunião confirmada; explique que o enquadramento depende do contexto e conduza para duas janelas reais.",
    contexto: "Se perguntarem preço, identifique primeiro escopo e necessidade com uma pergunta fechada A/B antes de responder.",
    enviar: "Se perguntarem preço, responda com transparência usando exclusivamente valores cadastrados.",
  },
  recusou: {
    encerrar: "Diante de recusa clara, agradeça e encerre imediatamente, sem pergunta, recuperação ou follow-up.",
    recuperar: "Diante de hesitação, use no máximo um novo ângulo fundamentado; diante de recusa clara, encerre sem insistir.",
    followup: "Somente diante de adiamento, e não de recusa clara, combine uma retomada; nunca agende follow-up contra a vontade do lead.",
  },
};

/** Próxima abertura do horário comercial configurado no agente (America/Sao_Paulo). */
function nextScheduleOpening(schedule: any): string {
  const localNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const days: number[] = Array.isArray(schedule?.days) && schedule.days.length
    ? schedule.days.map(Number)
    : [1, 2, 3, 4, 5];
  const [hours, minutes] = String(schedule?.start || "08:30").split(":").map(Number);
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate() + offset,
      hours || 0,
      minutes || 0,
    ));
    if (!days.includes(candidate.getUTCDay()) || candidate.getTime() <= localNow.getTime()) continue;
    return new Date(candidate.getTime() + 3 * 60 * 60 * 1000).toISOString();
  }
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}


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
  muito: "Insistência alta: use no máximo três ângulos de valor diferentes. Pare imediatamente diante de recusa clara, opt-out ou desinteresse persistente.",
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
  const priorities = Array.isArray(s.priorities) && s.priorities.length
    ? s.priorities.join(" → ")
    : "conexao → necessidade → valor → objecoes → fechamento";
  const situationInstructions = Object.entries(agent.situations ?? {})
    .map(([situation, choice]) => SITUATION_GUIDE[situation]?.[String(choice)])
    .filter(Boolean)
    .map((instruction) => `- ${instruction}`)
    .join("\n");
  return `
NOME DO SDR: ${agent.name}
  OBJETIVO FINAL: ${agent.objective}${agent.objective_custom ? ` — INSTRUÇÃO PERSONALIZADA DO USUÁRIO: ${agent.objective_custom}` : ""}
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
${links || k.links || "-"}

ESTILO OBRIGATÓRIO:
${TONE_GUIDE[p.tone] ?? ""}
${FORMALITY_GUIDE[p.formality] ?? ""}
${LENGTH_GUIDE[p.length] ?? ""}
${EMOJI_GUIDE[p.emojis] ?? ""}
${QUESTION_GUIDE[p.questions] ?? ""}

HORÁRIO DE ATENDIMENTO CONFIGURADO: ${
    agent.schedule?.mode === "always"
      ? "24h por dia, todos os dias"
      : `dias ${(agent.schedule?.days || []).join(", ") || "-"} das ${agent.schedule?.start || "-"} às ${agent.schedule?.end || "-"}`
  }. Nunca prometa atendimento humano ou retorno fora desse horário.

REGRAS INEGOCIÁVEIS:
${p.leads_conversation === false ? "- Acompanhe o ritmo do lead: responda o que foi perguntado e só conduza quando ele abrir espaço." : "- O SDR SEMPRE conduz a conversa e nunca devolve o comando ao lead."}
${p.never_wait_lead === false ? "- É aceitável encerrar a mensagem sem próximo passo quando o lead pediu tempo para pensar." : "- NUNCA esperar o lead decidir sozinho: toda resposta termina com um próximo passo claro."}
- Se o lead enviar um áudio que não pôde ser transcrito, avise com naturalidade e peça que ele escreva ou reenvie o áudio.
- Nunca inventar informação fora do conhecimento acima.
  - Antes de recomendar, conecte a dor identificada ao produto/serviço mais aderente e explique o valor com base apenas nos diferenciais, cases, políticas e materiais cadastrados.
  - Torne-se especialista no contexto cadastrado: traduza características em impacto empresarial para ESTE público-alvo, use a linguagem do nicho e selecione somente o produto cujo campo “OFERECER QUANDO” combina com a dor comprovada.
  - Não apresente catálogo. Escolha uma recomendação principal, explique em uma frase por que ela é aderente e só cite alternativa se houver uma diferença relevante para a decisão.
  - Antes de avançar, descubra o problema, o impacto operacional/financeiro, a prioridade e o processo de decisão. Não repita perguntas já respondidas no histórico ou na memória.
  - Use gatilhos B2B com ética: especificidade, prova, autoridade, custo da inação, contraste, compromisso e urgência somente quando houver fundamento real. Nunca fabrique escassez, prazo, case ou resultado.
  - PROVA: use apenas cases cadastrados. AUTORIDADE: use apenas diferenciais verificáveis. CUSTO DA INAÇÃO: derive da dor relatada, sem criar números. URGÊNCIA: só quando houver prazo real informado pelo lead ou cadastrado.
  - Quando precisar de decisão, prefira UMA pergunta de escolha guiada com DUAS alternativas úteis e concretas (A ou B), em vez de uma pergunta aberta que convide apenas a “não”.
  - Toda pergunta de avanço deve ser fechada e oferecer duas respostas úteis: prioridade A/B, cenário A/B, próximo passo A/B ou horário A/B. Não crie falsa dicotomia e não use alternativas que pressupõem uma compra ainda não consentida.
  - A escolha guiada nunca autoriza pressão: se houver recusa clara, pedido para parar ou desinteresse, acolha, não insista e respeite os critérios de encerramento.
${(agent.situations ?? {}).preco === "nunca_sem_reuniao" ? "- NUNCA informar preço antes de a reunião estar agendada." : ""}

PLAYBOOK DO OBJETIVO:
${OBJECTIVE_PLAYBOOK[agent.objective] ?? "Conduza a conversa até o objetivo configurado."}

FUNIL OBRIGATÓRIO (avance um passo por vez, sem pular etapas):
${PIPELINE_STEPS}
ORDEM DE PRIORIDADE CONFIGURADA PELO USUÁRIO: ${priorities}

ESTRATÉGIA: insistência ${s.insistence}; voltar ao objetivo ${s.return_to_goal}; objeções: ${s.on_objection}.
${INSISTENCE_GUIDE[s.insistence] ?? ""}
${RETURN_GUIDE[s.return_to_goal] ?? ""}
${OBJECTION_GUIDE[s.on_objection] ?? ""}
GATILHOS DE ATIVAÇÃO: ${(t.activation || []).join(", ") || "inbound_all"}.
ENCERRAMENTO: parar quando ${(c.stop_criteria || []).join(", ")}${c.stop_no_reply_hours ? ` (sem resposta por ${c.stop_no_reply_hours}h)` : ""}; follow-ups até ${c.followup_max} em modo ${c.followup_mode}${c.followup_mode === "inteligente" ? ` (intervalo variável entre ${c.followup_min_hours ?? 12}h e ${c.followup_max_hours ?? 48}h, sempre dentro do horário de atendimento)` : ""}.
SITUAÇÕES CONFIGURADAS: ${JSON.stringify(agent.situations ?? {})}
COMPORTAMENTO NAS SITUAÇÕES:
${situationInstructions || "- Siga o diagnóstico e as regras gerais."}
CONFIGURAÇÃO COMPLETA DE GATILHOS: ${JSON.stringify(agent.triggers ?? {})}
`.trim();
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    if (!isInternal && persist) {
      return new Response(JSON.stringify({ error: "Persistência disponível somente no fluxo interno" }), {
        status: 403,
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

    // ---------- BYOK: chave e modelo do próprio cliente ----------
    const { data: credential } = await supabase
      .from("user_ai_credentials")
      .select("encrypted_key,model,is_active")
      .eq("user_id", agent.owner_user_id)
      .eq("provider", "openai")
      .maybeSingle();

    if (!credential?.encrypted_key || credential.is_active === false) {
      return new Response(
        JSON.stringify({
          error:
            "Nenhuma chave da OpenAI configurada para esta conta. Conecte sua chave na etapa Inteligência do SDR.",
          code: "missing_api_key",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let openaiApiKey: string;
    try {
      openaiApiKey = await decryptApiKey(credential.encrypted_key);
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: "Não foi possível ler a chave da OpenAI. Reconecte sua chave.", code: "invalid_api_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiModel: string = agent.ai?.model || credential.model || DEFAULT_MODEL;

    let session: any = null;
    if (sessionId) {
      const { data } = await supabase.from("sdr_sessions").select("*").eq("id", sessionId).maybeSingle();
      session = data;
    }


    // ---------- AGENDA: horários realmente livres do responsável ----------
    // Vendedores que recebem reuniões; com "distribuir igualmente" escolhemos
    // quem tem menos compromissos futuros (round robin real por carga).
    const meetingSellers: string[] = (agent.strategy?.meeting_sellers ?? [])
      .map((s: any) => s?.user_id)
      .filter((id: unknown): id is string => typeof id === "string" && !!id);

    let responsibleUserId: string =
      meetingSellers[0] ??
      agent.strategy?.handoff_sellers?.find((s: any) => s?.user_id)?.user_id ??
      agent.closing?.notify_sellers?.find((s: any) => s?.user_id)?.user_id ??
      agent.owner_user_id;

    if (meetingSellers.length > 1 && agent.strategy?.meeting_distribution !== "fixo") {
      const { data: upcoming } = await supabase
        .from("calendar_events")
        .select("assigned_user_id")
        .in("assigned_user_id", meetingSellers)
        .in("status", ["scheduled", "confirmed"])
        .gte("starts_at", new Date().toISOString());
      const load = new Map<string, number>(meetingSellers.map((id) => [id, 0]));
      for (const row of upcoming ?? []) {
        load.set(row.assigned_user_id, (load.get(row.assigned_user_id) ?? 0) + 1);
      }
      responsibleUserId = meetingSellers.reduce((best, id) =>
        (load.get(id) ?? 0) < (load.get(best) ?? 0) ? id : best,
      meetingSellers[0]);
    }

    const meetingDuration = Number(agent.closing?.meeting_duration_minutes) || 60;
    let freeSlots: FreeSlot[] = [];
    try {
      const availabilityResponse = await fetch(`${supabaseUrl}/functions/v1/sdr-agenda`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          responsibleUserId,
          schedule: agent.schedule ?? {},
          durationMinutes: meetingDuration,
        }),
      });
      if (availabilityResponse.ok) {
        const availability = await availabilityResponse.json();
        freeSlots = Array.isArray(availability?.slots) ? availability.slots : [];
      } else {
        console.error("[sdr-brain] sdr-agenda falhou:", availabilityResponse.status, await availabilityResponse.text());
      }
    } catch (agendaError) {
      console.error("[sdr-brain] não foi possível consultar sdr-agenda:", agendaError);
    }

    const agendaBlock = freeSlots.length
      ? `AGENDA REAL DO RESPONSÁVEL (fuso ${CALENDAR_TIMEZONE}) — horários LIVRES, duração de ${meetingDuration} minutos:
${freeSlots.map((s) => `- ${s.label} | iso: ${s.iso}`).join("\n")}

REGRAS DE AGENDAMENTO (inegociáveis):
- Ofereça EXATAMENTE 2 opções por mensagem, sempre retiradas da lista acima, numa única pergunta de escolha ("você prefere A ou B?"). Se só existir 1 opção livre, peça permissão para confirmar essa única janela sem inventar outra.
- NUNCA sugira, confirme ou aceite um horário que não esteja na lista: ele está ocupado ou fora do atendimento.
- Se o lead pedir um horário fora da lista, diga que aquele horário não está disponível e ofereça as opções livres mais próximas.
- Só marque como confirmado quando o lead escolher explicitamente uma das opções.`
      : `AGENDA REAL DO RESPONSÁVEL: não há horários livres nos próximos dias. Não ofereça horários; diga que vai confirmar a disponibilidade e retornar.`;

    const brief = `${agentBrief(agent)}\n\n${agendaBlock}`;
    const historyText =
      history.map((m) => `${m.role === "assistant" ? "SDR" : "LEAD"}: ${m.content}`).join("\n") ||
      "(sem histórico)";


    // ---------- CAMADAS 1-5: Contexto, Memória, Compreensão, Planejamento, Estratégia ----------
    const analysisSystem = `Você é o cérebro analítico de um SDR de alta performance no WhatsApp (B2B).
Você NÃO escreve a resposta ao lead. Você apenas analisa e decide a estratégia.
Você SEMPRE identifica em qual passo do funil a conversa está (conexao, necessidade, valor, objecoes, fechamento), inclusive em follow-ups e reaberturas, e define o próximo passo sem pular etapas.
Seu diagnóstico deve ligar explicitamente: fato dito pelo lead → dor e impacto → produto mais aderente conforme “OFERECER QUANDO” → diferencial/case verificável → próximo microcompromisso.
Se não houver informação suficiente para escolher um produto, o próximo passo é uma pergunta diagnóstica fechada com duas alternativas plausíveis, nunca uma recomendação inventada.
Recusa clara, opt-out ou desinteresse prevalecem sobre insistência, objetivo e fechamento: proxima_acao = encerrar.
Responda SEMPRE em JSON válido com o formato:
{
 "memoria": {"fatos": [string], "promessas": [string], "objecoes": [string]},
 "intencao": string,
 "sentimento": "positivo|neutro|negativo",
 "dor": string,
 "impacto": string,
 "produto_recomendado": string|null,
 "justificativa_produto": string,
 "gatilho_etico": "prova|autoridade|custo_da_inacao|contraste|compromisso|urgencia|nenhum",
 "abertura": "alta|media|baixa",
 "estagio": "nao_conhece|conhece|interesse|comparando|negociando|pronto|recusou",
 "cenarios": [{"resposta": string, "probabilidade_de_continuar": number}],
 "passo_atual": "conexao|necessidade|valor|objecoes|fechamento",
 "proximo_passo": "conexao|necessidade|valor|objecoes|fechamento",
 "micro_objetivo": string,
 "estrategia": string,
 "proxima_acao": "responder|aguardar|followup|chamar_vendedor|encerrar",
 "agendamento": {"confirmado": boolean, "inicio_iso": string|null, "tipo": "meeting|demo|call|visit", "titulo": string, "observacao": string, "opcoes_iso": [string]}

Regras do campo "agendamento":
 - "opcoes_iso" traz exatamente 2 horários da lista de horários livres quando for o momento de oferecer (vazio se não for o momento; 1 apenas quando só houver uma janela livre).
- "confirmado" só é true quando o lead escolheu explicitamente um horário; nesse caso "inicio_iso" precisa ser EXATAMENTE um iso da lista de horários livres.
- Se o horário desejado pelo lead não estiver na lista, "confirmado" = false e "inicio_iso" = null.
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

    const analysisRes = await chat(openaiApiKey, aiModel, analysisSystem, analysisUser);
    const analysis = safeJson(analysisRes.content);
    await logAiUsage({
      feature: "sdr_brain_analysis",
      model: aiModel,
      usage: analysisRes.usage,
      user_id: user?.id ?? agent.owner_user_id,
      metadata: { agent_id: agentId },
    });

    // ---------- CAMADAS 6-7: Redação + Estruturação em mensagens curtas ----------
    const writerSystem = `Você é um SDR humano experiente, especialista no negócio configurado, conversando pelo WhatsApp.
Regras absolutas:
- NUNCA escreva textão. Divida em 2 a 4 mensagens curtas e naturais.
- Cada mensagem tem um único assunto (saudação, contexto, pergunta, CTA).
- Nunca invente informações que não estejam no conhecimento fornecido.
- Faça no máximo UMA pergunta por resposta.
- Siga o micro-objetivo e o passo do funil definidos pela análise, sem forçar a venda nem pular etapas.
- Personalize com fatos reais do lead e do negócio cadastrado. Demonstre expertise conectando a dor ao impacto e ao produto ideal; não despeje catálogo nem use elogios genéricos.
- Use no máximo um gatilho mental por resposta e somente se sustentado por informação real no contexto. Nunca fabrique urgência, escassez, autoridade, economia ou prova social.
- Em follow-ups, retome explicitamente o ponto onde a conversa parou.
- Toda pergunta que avance a conversa deve ser fechada e conter duas alternativas úteis, naturais e verdadeiras (A ou B). Para agenda, use exatamente duas janelas presentes na AGENDA REAL. Nunca invente alternativa.
- Exemplo de agenda correto: “Você prefere quarta (12/08) às 10h ou quinta (13/08) às 15h?”; incorreto: “Amanhã às 10h fica bom?”.
- Se o lead negar, pedir para parar ou demonstrar desinteresse claro, não use escolha forçada, não pressione e siga a configuração de encerramento.
Responda SEMPRE em JSON: {"mensagens": [string], "proxima_acao": string, "justificativa": string}`;
    const writerUser = `CONFIGURAÇÃO DO SDR:
${brief}

ANÁLISE E ESTRATÉGIA:
${JSON.stringify(analysis)}

HISTÓRICO:
${historyText}

MENSAGEM DO LEAD: ${inbound || "(primeiro contato / follow-up)"}

Escreva a sequência de mensagens.`;

    const writerRes = await chat(openaiApiKey, aiModel, writerSystem, writerUser);
    const written = safeJson(writerRes.content);
    await logAiUsage({
      feature: "sdr_brain_writer",
      model: aiModel,
      usage: writerRes.usage,
      user_id: user?.id ?? agent.owner_user_id,
      metadata: { agent_id: agentId },
    });

    let messages: string[] = Array.isArray(written.mensagens)
      ? written.mensagens.filter((m: any) => typeof m === "string" && m.trim())
      : [];

    // ---------- CAMADA 8: Validação / Autocrítica ----------
    const validatorSystem = `Você é um revisor crítico de mensagens de vendas no WhatsApp.
Checklist: respondeu o lead? avançou a negociação? manteve contexto? objetivo continua vivo? soa humano? mensagens curtas? educada? não insistiu demais? criou valor? conectou dor ao produto certo sem inventar? toda pergunta de avanço tem exatamente duas alternativas reais? horários vieram da agenda? gatilho comercial tem fundamento explícito? respeitou eventual recusa? tem próximo passo?
Se reprovar em qualquer item, reescreva.
Responda SEMPRE em JSON: {"aprovado": boolean, "checklist": {"[item]": boolean}, "mensagens_finais": [string], "motivo": string}`;
    const validatorUser = `CONFIGURAÇÃO:
${brief}

MICRO-OBJETIVO: ${analysis.micro_objetivo ?? "-"}

MENSAGENS PROPOSTAS:
${JSON.stringify(messages)}

HISTÓRICO:
${historyText}`;

    const validationRes = await chat(openaiApiKey, aiModel, validatorSystem, validatorUser);
    const validation = safeJson(validationRes.content);
    await logAiUsage({
      feature: "sdr_brain_validator",
      model: aiModel,
      usage: validationRes.usage,
      user_id: user?.id ?? agent.owner_user_id,
      metadata: { agent_id: agentId },
    });

    if (Array.isArray(validation.mensagens_finais) && validation.mensagens_finais.length) {
      messages = validation.mensagens_finais.filter((m: any) => typeof m === "string" && m.trim());
    } else if (validation.aprovado === false) {
      console.error("[sdr-brain] validator rejected response without a safe rewrite", validation.motivo);
      messages = [];
      written.proxima_acao = "aguardar";
    }

    // Regra fixa: com "nunca falar preço sem reunião", o SDR NUNCA informa valores.
    // Quando a reunião é confirmada o objetivo está concluído e a conversa sai do SDR.
    if (agent.situations?.preco === "nunca_sem_reuniao") {
      const disclosedPrice = messages.some((text) => /(?:R\$\s*\d|\b\d+(?:[.,]\d{2})?\s*(?:reais|por m[eê]s|\/m[eê]s))/i.test(text));
      if (disclosedPrice) {
        console.error("[sdr-brain] blocked price disclosure (nunca_sem_reuniao)");
        messages = [];
        written.proxima_acao = "aguardar";
      }
    }

    const detectedObjections = Array.isArray(analysis?.memoria?.objecoes)
      ? analysis.memoria.objecoes.filter((item: unknown) => typeof item === "string" && item.trim())
      : [];
    if (agent.strategy?.on_objection === "vendedor" && (detectedObjections.length > 0 || analysis?.passo_atual === "objecoes")) {
      written.proxima_acao = "chamar_vendedor";
    }

    // ---------- AGENDAMENTO AUTOMÁTICO: Agenda + CRM + e-mail ao responsável ----------
    let scheduled: Record<string, unknown> | null = null;
    const booking = analysis?.agendamento ?? {};
    const candidateTime = typeof booking?.inicio_iso === "string" ? new Date(booking.inicio_iso).getTime() : Number.NaN;
    const chosenSlot = booking?.confirmado === true && !Number.isNaN(candidateTime)
      ? freeSlots.find((slot) => new Date(slot.iso).getTime() === candidateTime) ?? null
      : null;

    if (persist && chosenSlot) {
      const leadId: string | null = session?.lead_id ?? leadContext?.lead_id ?? null;
      const contactName: string =
        session?.contact_name || leadContext?.contact_name || leadContext?.company_name || "Lead";
      const contactPhone: string = session?.phone || leadContext?.phone || "";
      const startsAt = new Date(chosenSlot.iso);
      const endsAt = new Date(startsAt.getTime() + meetingDuration * 60_000);
      const eventType = ["meeting", "demo", "call", "visit"].includes(booking.tipo)
        ? booking.tipo
        : "meeting";

      let existingMeetingQuery = supabase
        .from("calendar_events")
        .select("id, starts_at")
        .eq("sdr_agent_id", agentId)
        .in("status", ["scheduled", "confirmed"])
        .gte("starts_at", new Date().toISOString())
        .limit(1);
      if (leadId) existingMeetingQuery = existingMeetingQuery.eq("lead_id", leadId);
      else if (session?.id) existingMeetingQuery = existingMeetingQuery.contains("metadata", { session_id: session.id });
      const { data: existingMeeting } = leadId || session?.id
        ? await existingMeetingQuery.maybeSingle()
        : { data: null };

      if (existingMeeting) {
        scheduled = { event_id: existingMeeting.id, starts_at: existingMeeting.starts_at, existing: true };
      }

      const { data: event, error: eventError } = existingMeeting ? { data: existingMeeting, error: null } : await supabase
        .from("calendar_events")
        .insert({
          owner_user_id: agent.owner_user_id,
          assigned_user_id: responsibleUserId,
          created_by: null,
          title: (booking.titulo as string) || `Reunião com ${contactName}`,
          description: (booking.observacao as string) || analysis?.micro_objetivo || null,
          event_type: eventType,
          status: "scheduled",
          source: "sdr",
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          timezone: CALENDAR_TIMEZONE,
          lead_id: leadId,
          sdr_agent_id: agentId,
          contact_name: contactName,
          company_name: leadContext?.company_name ?? null,
          contact_phone: contactPhone || null,
          contact_email: leadContext?.email ?? null,
          notes: `Agendado automaticamente pelo SDR ${agent.name}.`,
          reminders: [15],
          metadata: { session_id: session?.id ?? null, agent_id: agentId },
        })
        .select("id, starts_at")
        .maybeSingle();

      if (eventError) {
        // Conflito de horário (exclusion constraint) ou falha: não quebra a conversa
        console.error("[sdr-brain] falha ao criar evento na agenda:", eventError.message);
        messages = ["Esse horário acabou de ficar indisponível.", freeSlots.length >= 2
          ? `Você prefere ${freeSlots[0].label} ou ${freeSlots[1].label}?`
          : "Vou validar a próxima janela livre e retorno para você."];
      } else if (existingMeeting) {
        messages = ["Seu horário já está reservado na nossa agenda."];
      } else {
        scheduled = { event_id: event?.id, starts_at: event?.starts_at, label: chosenSlot.label };

        // 1) CRM: move o lead para o estágio de reunião marcada e registra a atividade
        if (leadId) {
          const stageId: string | null =
            agent.closing?.meeting_stage_id ??
            (await (async () => {
              const { data: stage } = await supabase
                .from("pipeline_stages")
                .select("id")
                .eq("user_id", agent.owner_user_id)
                .in("name", ["Qualificado", "Em Negociação"])
                .order("name", { ascending: true })
                .limit(1)
                .maybeSingle();
              return stage?.id ?? null;
            })());

          await supabase
            .from("leads")
            .update({
              ...(stageId ? { pipeline_stage_id: stageId } : {}),
              responsible_user_id: responsibleUserId,
              has_responded: true,
              last_response_at: new Date().toISOString(),
            })
            .eq("id", leadId);

          await supabase.from("lead_activities").insert({
            lead_id: leadId,
            user_id: agent.owner_user_id,
            owner_user_id: agent.owner_user_id,
            activity_type: "meeting_scheduled",
            description: `${agent.name} agendou ${eventType === "demo" ? "uma demonstração" : "uma reunião"} para ${chosenSlot.label}.`,
            metadata: { event_id: event?.id, source: "sdr", starts_at: startsAt.toISOString() },
          });
        }

        // 2) E-mail para o responsável
        try {
          const { data: responsibleProfile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("id", responsibleUserId)
            .maybeSingle();

          const recipients = new Set<string>();
          if (responsibleProfile?.email) recipients.add(responsibleProfile.email);
          if (agent.closing?.notify_seller !== false) {
            for (const s of agent.closing?.notify_sellers ?? []) {
              if (s?.email) recipients.add(s.email);
            }
            if (agent.closing?.notify_seller_email) recipients.add(agent.closing.notify_seller_email);
          }

          for (const email of recipients) {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
              body: JSON.stringify({
                user_id: agent.owner_user_id,
                email_type: "SDR_MEETING_SCHEDULED",
                override_email: email,
                idempotency_key: `sdr-meeting-${event?.id}-${email}`,
                payload: {
                  sdr_name: agent.name,
                  contact_name: contactName,
                  company_name: leadContext?.company_name ?? "",
                  contact_phone: contactPhone,
                  when_label: chosenSlot.label,
                  duration_minutes: meetingDuration,
                  event_type: eventType,
                  notes: (booking.observacao as string) || analysis?.micro_objetivo || "",
                  responsible_name: responsibleProfile?.name ?? "",
                },
              }),
            });
          }
        } catch (err) {
          console.error("[sdr-brain] falha ao notificar responsável:", err);
        }
      }
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

      if (session?.id && session.agent_id === agentId && session.owner_user_id === agent.owner_user_id) {
        const nextAction = written.proxima_acao ?? analysis.proxima_acao ?? "aguardar";
        const followupMin = Math.max(1, Number(agent.closing?.followup_min_hours) || 12);
        const followupMax = Math.max(followupMin, Number(agent.closing?.followup_max_hours) || 48);
        const manualInterval = Math.max(1, Number(agent.closing?.followup_interval_hours) || 24);
        const followupHours = agent.closing?.followup_mode === "inteligente"
          ? followupMin + Math.random() * (followupMax - followupMin)
          : manualInterval;
        const followupsLeft = (session.followups_sent ?? 0) < (Number(agent.closing?.followup_max) || 0);

        const stageNow = String(analysis?.estagio ?? "");
        const refused = stageNow === "recusou";
        const refusalMode = agent.situations?.recusou ?? "recuperar";
        // Recusa clara + "encerrar" => a conversa sai do SDR sem follow-up.
        const closeOnRefusal = refused && refusalMode === "encerrar";
        // Recusa clara + "followup" => aceita o não agora e retoma dias depois.
        const refusalFollowup = refused && refusalMode === "followup" && followupsLeft;

        // Cliente ocupado: a IA retoma sozinha na próxima janela comercial.
        const busyMode = agent.situations?.ocupado;
        const busyDetected = /(?:ocupad|sem tempo|agora n[aã]o|depois eu|mais tarde|em reuni[aã]o)/i.test(inbound || "");
        const busyReschedule = busyDetected && (busyMode === "outro_horario" || busyMode === "aguardar") && followupsLeft && !refused;

        // Objetivo concluído: reunião confirmada na agenda encerra o ciclo do SDR.
        const objectiveDone = Boolean(scheduled) || analysis?.objetivo_concluido === true;

        let shouldScheduleFollowup = (nextAction === "followup" || refusalFollowup || busyReschedule) &&
          followupsLeft && !closeOnRefusal && !objectiveDone;

        const nextFollowupAt = shouldScheduleFollowup
          ? busyReschedule
            ? nextScheduleOpening(agent.schedule)
            : new Date(Date.now() + followupHours * 60 * 60 * 1000).toISOString()
          : null;

        // Proposta em PDF enviada ao concluir o objetivo "Enviar proposta".
        const proposalFile = agent.closing?.proposal_file;
        const proposalAlreadySent = Boolean((session.memory as any)?.proposal_sent);
        if (
          objectiveDone && agent.objective === "proposta" && proposalFile?.path &&
          !proposalAlreadySent && session.waba_connection_id && session.phone
        ) {
          try {
            const { data: signed } = await supabase.storage
              .from("sdr-proposals")
              .createSignedUrl(proposalFile.path, 60 * 60 * 24 * 7);
            const { data: connection } = await supabase
              .from("user_waba_connections")
              .select("access_token, phone_number_id")
              .eq("id", session.waba_connection_id)
              .maybeSingle();
            if (signed?.signedUrl && connection?.access_token) {
              const proposalResponse = await fetch(
                `https://graph.facebook.com/v21.0/${session.phone_number_id || connection.phone_number_id}/messages`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${connection.access_token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: String(session.phone).replace(/\D/g, ""),
                    type: "document",
                    document: {
                      link: signed.signedUrl,
                      filename: proposalFile.name || "proposta.pdf",
                      caption: "Segue a proposta comercial em anexo.",
                    },
                  }),
                },
              );
              if (!proposalResponse.ok) {
                console.error("[sdr-brain] falha ao enviar proposta:", proposalResponse.status, await proposalResponse.text());
              }
            }
          } catch (err) {
            console.error("[sdr-brain] erro ao enviar proposta em PDF:", err);
          }
        }

        const nextStatus = objectiveDone
          ? "won"
          : closeOnRefusal
            ? "closed"
            : nextAction === "chamar_vendedor"
              ? "handoff"
              : session.status;

        await supabase
          .from("sdr_sessions")
          .update({
            status: nextStatus,
            ...(objectiveDone || closeOnRefusal
              ? { closed_reason: objectiveDone ? "objective_completed" : "lead_refused" }
              : {}),
            stage: analysis.proximo_passo ?? analysis.passo_atual ?? analysis.estagio ?? session.stage,
            current_goal: analysis.micro_objetivo ?? session.current_goal,
            memory: {
              ...(analysis.memoria ?? session.memory ?? {}),
              ...(objectiveDone && agent.objective === "proposta" && proposalFile?.path
                ? { proposal_sent: true }
                : {}),
            },
            messages_sent: (session.messages_sent ?? 0) + messages.length,
            replies_received: (session.replies_received ?? 0) + (inbound ? 1 : 0),
            last_message_at: new Date().toISOString(),
            ...(inbound ? { last_reply_at: new Date().toISOString() } : {}),
            last_processed_at: new Date().toISOString(),
            next_followup_at: nextFollowupAt,
            followup_reason: shouldScheduleFollowup
              ? busyReschedule
                ? "Lead ocupado: retomar no próximo horário comercial"
                : refusalFollowup
                  ? "Recusa temporária: retomar em alguns dias"
                  : analysis.micro_objetivo ?? "Retomar negociação"
              : null,
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
        scheduled,
        free_slots: freeSlots.slice(0, 3),
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
